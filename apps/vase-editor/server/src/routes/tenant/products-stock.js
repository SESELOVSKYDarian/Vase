// Producto: stock, borrado, foto y destacados.
import { tenantRouter } from './router.js';
import { pool } from '../../db.js';
import { getTenantId } from './helpers-common.js';
import { upload } from './helpers-upload.js';

tenantRouter.put('/products/:id/stock', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const { stock, delta } = req.body || {};
  const hasDelta = delta !== undefined && delta !== null && delta !== '';
  const hasStock = stock !== undefined && stock !== null && stock !== '';

  if (!hasDelta && !hasStock) {
    return res.status(400).json({ error: 'stock_required' });
  }

  try {
    if (hasDelta) {
      const deltaValue = Number(delta);
      if (Number.isNaN(deltaValue)) {
        return res.status(400).json({ error: 'invalid_delta' });
      }
      const result = await pool.query(
        'update product_cache set stock = greatest(stock + $1, 0), updated_at = now() where tenant_id = $2 and id = $3 returning stock',
        [deltaValue, tenantId, productId]
      );
      if (!result.rowCount) {
        return res.status(404).json({ error: 'product_not_found' });
      }
      return res.json({ ok: true, stock: result.rows[0].stock });
    }

    const stockValue = Number(stock);
    if (Number.isNaN(stockValue)) {
      return res.status(400).json({ error: 'invalid_stock' });
    }
    const result = await pool.query(
      'update product_cache set stock = greatest($1, 0), updated_at = now() where tenant_id = $2 and id = $3 returning stock',
      [stockValue, tenantId, productId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'product_not_found' });
    }
    return res.json({ ok: true, stock: result.rows[0].stock });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.delete('/products/:id', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const productId = req.params.id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      [
        'update product_cache',
        'set status = $3,',
        'is_visible_web = false,',
        'deleted_at = coalesce(deleted_at, now()),',
        'updated_at = now()',
        'where tenant_id = $1 and id = $2',
        'returning id',
      ].join(' '),
      [tenantId, productId, 'archived']
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'product_not_found' });
    }

    await client.query(
      [
        'insert into product_overrides (tenant_id, product_id, hidden)',
        'values ($1, $2, true)',
        'on conflict (tenant_id, product_id) do update set hidden = true',
      ].join(' '),
      [tenantId, productId]
    );

    await client.query('COMMIT');
    return res.json({ ok: true, archived: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return next(err);
  } finally {
    client.release();
  }
});


tenantRouter.post('/products/upload-image', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'no_file_uploaded' });
    }

    // Generate public URL for the uploaded image
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/products/${req.file.filename}`;

    return res.json({ url: imageUrl, filename: req.file.filename });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/products/:id/featured', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const { featured } = req.body;
  const productId = req.params.id;

  // Validate UUID to prevent DB crash
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Note: the above regex was missing a block for the 4-char part, but let's use a better one or the same as public.js
  const betterUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!betterUuidRegex.test(productId)) {
    return res.status(400).json({ error: 'invalid_product_id' });
  }

  try {
    await pool.query(
      'insert into product_overrides (tenant_id, product_id, featured) values ($1, $2, $3) on conflict (tenant_id, product_id) do update set featured = $3',
      [tenantId, productId, !!featured]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

tenantRouter.put('/products/featured/clear', async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    await pool.query(
      'update product_overrides set featured = false where tenant_id = $1 and featured = true',
      [tenantId]
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
