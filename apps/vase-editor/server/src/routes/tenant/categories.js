// Rubros del catálogo: listar, crear, editar y borrar.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { getTenantId, isUuid, slugify } from './helpers-common.js';

tenantRouter.get('/categories', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const result = await pool.query(
      [
        'select c.id, c.name, c.slug,',
        "nullif(c.data->>'parent_id', '') as parent_id,",
        'parent.name as parent_name,',
        // Cómo se llama en el sistema de gestión (si vino de ahí), para mostrarlo al renombrarla.
        "coalesce(nullif(c.data->>'source_category_label', ''), nullif(c.erp_id, '')) as source_name,",
        "(c.data->>'auto_created_by') = 'integration_sync' as from_sync",
        'from categories c',
        "left join categories parent on parent.tenant_id = c.tenant_id and parent.id::text = nullif(c.data->>'parent_id', '')",
        'where c.tenant_id = $1',
        [
          "order by coalesce(parent.name, c.name) asc,",
          "case when nullif(c.data->>'parent_id', '') is null then 0 else 1 end asc,",
          'c.name asc',
        ].join(' '),
      ].join(' '),
      [tenantId]
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

// Renombrar una categoría o moverla dentro de otra. Si la categoría vino del sistema de gestión, su
// nombre original queda en erp_id: la sincronización la sigue encontrando por ese nombre y no crea
// una copia, y en la tienda se ve el nombre nuevo.
tenantRouter.put('/categories/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const categoryId = req.params.id;
  if (!isUuid(categoryId)) {
    return res.status(400).json({ error: 'invalid_category_id' });
  }
  const body = req.body || {};
  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasParent = Object.prototype.hasOwnProperty.call(body, 'parent_id');
  const name = hasName ? String(body.name || '').trim() : '';
  const parentId = hasParent ? String(body.parent_id || '').trim() : '';
  if (hasName && !name) {
    return res.status(400).json({ error: 'name_required' });
  }
  if (parentId && !isUuid(parentId)) {
    return res.status(400).json({ error: 'invalid_parent_category_id' });
  }
  if (parentId && parentId === categoryId) {
    return res.status(400).json({ error: 'category_cycle' });
  }

  try {
    const existingRes = await pool.query(
      'select id, name, slug, erp_id, data from categories where tenant_id = $1 and id = $2',
      [tenantId, categoryId]
    );
    if (!existingRes.rowCount) {
      return res.status(404).json({ error: 'category_not_found' });
    }
    const existing = existingRes.rows[0];
    const data = existing.data && typeof existing.data === 'object' ? { ...existing.data } : {};

    if (hasParent) {
      if (parentId) {
        // No se puede mover una categoría dentro de una de sus propias subcategorías.
        let cursor = parentId;
        for (let depth = 0; cursor && depth < 20; depth += 1) {
          const parentRes = await pool.query(
            "select id, nullif(data->>'parent_id', '') as parent_id from categories where tenant_id = $1 and id = $2",
            [tenantId, cursor]
          );
          if (!parentRes.rowCount) {
            return res.status(404).json({ error: 'parent_category_not_found' });
          }
          if (parentRes.rows[0].parent_id === categoryId) {
            return res.status(400).json({ error: 'category_cycle' });
          }
          cursor = parentRes.rows[0].parent_id;
        }
        data.parent_id = parentId;
      } else {
        delete data.parent_id;
      }
    }

    const nextName = hasName ? name : existing.name;
    const renamed = nextName !== existing.name;
    const erpId = String(existing.erp_id || '').trim() || (renamed ? existing.name : null);
    if (renamed && !data.source_category_label && data.auto_created_by === 'integration_sync') {
      data.source_category_label = existing.name;
    }

    const updated = await pool.query(
      [
        'update categories set name = $3, erp_id = $4, data = $5::jsonb',
        'where tenant_id = $1 and id = $2',
        'returning id, name, slug',
      ].join(' '),
      [tenantId, categoryId, nextName, erpId, data]
    );
    return res.json({
      ...updated.rows[0],
      parent_id: data.parent_id || null,
      source_name: data.source_category_label || erpId || null,
      from_sync: data.auto_created_by === 'integration_sync',
    });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.post('/categories', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const name = String(req.body?.name || '').trim();
  const customSlug = String(req.body?.slug || '').trim();
  const parentId = String(req.body?.parent_id || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'name_required' });
  }
  if (parentId && !isUuid(parentId)) {
    return res.status(400).json({ error: 'invalid_parent_category_id' });
  }

  let baseSlug = slugify(customSlug || name);
  if (!baseSlug) {
    baseSlug = `category-${Date.now()}`;
  }

  const client = await pool.connect();
  try {
    let parentCategory = null;
    if (parentId) {
      const parentRes = await client.query(
        'select id, name, slug from categories where tenant_id = $1 and id = $2',
        [tenantId, parentId]
      );
      if (!parentRes.rowCount) {
        return res.status(404).json({ error: 'parent_category_not_found' });
      }
      parentCategory = parentRes.rows[0];
      if (!customSlug) {
        const candidateFromParent = slugify(`${parentCategory.slug}-${name}`);
        if (candidateFromParent) {
          baseSlug = candidateFromParent;
        }
      }
    }

    const payloadData = parentCategory
      ? { parent_id: parentCategory.id }
      : {};

    let suffix = 1;
    while (true) {
      const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
      const insertRes = await client.query(
        [
          'insert into categories (tenant_id, name, slug, data)',
          'values ($1, $2, $3, $4::jsonb)',
          'on conflict (tenant_id, slug) do nothing',
          'returning id, name, slug',
        ].join(' '),
        [tenantId, name, candidate, payloadData]
      );
      if (insertRes.rowCount) {
        return res.status(201).json({
          ...insertRes.rows[0],
          parent_id: parentCategory?.id || null,
          parent_name: parentCategory?.name || null,
        });
      }
      suffix += 1;
    }
  } catch (err) {
    return next(err);
  } finally {
    client.release();
  }
});

tenantRouter.delete('/categories/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const categoryId = req.params.id;
  if (!isUuid(categoryId)) {
    return res.status(400).json({ error: 'invalid_category_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryRes = await client.query(
      'select id, name from categories where tenant_id = $1 and id = $2',
      [tenantId, categoryId]
    );
    if (!categoryRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'category_not_found' });
    }

    const childrenRes = await client.query(
      [
        'select id, name',
        'from categories',
        "where tenant_id = $1 and nullif(data->>'parent_id', '') = $2",
        'order by name asc',
      ].join(' '),
      [tenantId, categoryId]
    );
    if (childrenRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'category_has_children',
        message: 'Debes eliminar primero las subcategorias de esta categoria',
        children: childrenRes.rows,
      });
    }

    // Keep advanced offers consistent when a category is removed.
    await client.query(
      [
        'update tenant_offers',
        'set category_ids = array_remove(category_ids, $2::uuid),',
        'updated_at = now()',
        'where tenant_id = $1 and $2::uuid = any(category_ids)',
      ].join(' '),
      [tenantId, categoryId]
    );

    await client.query(
      'delete from categories where tenant_id = $1 and id = $2',
      [tenantId, categoryId]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, id: categoryId });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});

// Brand Management
