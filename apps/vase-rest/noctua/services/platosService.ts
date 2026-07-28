import { createSupabaseClientWithNoctuaRole } from '@/services/supabaseRoleClient';
import type { CategoriaPlato, Plato, PlatoInput, PlatoRecetaItem } from '@/types/platos';

type CategoriaRow = {
  id: string;
  nombre: string;
};

type IngredienteRelationRow = {
  id: string;
  nombre: string;
  unidad_medida: string;
  stock_actual: number | string | null;
  stock_minimo: number | string | null;
};

type RecetaRow = {
  id: string;
  ingrediente_id: string;
  cantidad_necesaria: number | string;
  unidad: string;
  ingredientes?: IngredienteRelationRow | IngredienteRelationRow[] | null;
};

type ProductoRow = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number | string;
  categoria_id?: string | null;
  stock_actual?: number | string | null;
  disponible?: boolean | null;
  activo?: boolean | null;
  creado_en?: string | null;
  categorias?: CategoriaRow | CategoriaRow[] | null;
  producto_ingredientes?: RecetaRow[] | null;
};

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapReceta(row: RecetaRow): PlatoRecetaItem {
  const ingrediente = singleRelation(row.ingredientes);

  return {
    id: row.id,
    ingredienteId: row.ingrediente_id,
    ingredienteNombre: ingrediente?.nombre || 'Ingrediente eliminado',
    cantidadNecesaria: Number(row.cantidad_necesaria),
    unidad: row.unidad,
    stockActual: Number(ingrediente?.stock_actual ?? 0),
    stockMinimo: Number(ingrediente?.stock_minimo ?? 0),
  };
}

function calculateMaxDisponible(receta: PlatoRecetaItem[], stockActual: number) {
  if (receta.length === 0) return Math.max(0, Math.floor(stockActual || 0));

  const values = receta
    .filter((item) => item.cantidadNecesaria > 0)
    .map((item) => Math.floor(item.stockActual / item.cantidadNecesaria));

  if (values.length === 0) return 0;
  return Math.max(0, Math.min(...values));
}

function mapPlato(row: ProductoRow): Plato {
  const categoria = singleRelation(row.categorias);
  const receta = (row.producto_ingredientes ?? []).map(mapReceta);
  const stockActual = Number(row.stock_actual ?? 0);
  const maxDisponible = calculateMaxDisponible(receta, stockActual);

  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? null,
    precio: Number(row.precio ?? 0),
    categoriaId: row.categoria_id ?? null,
    categoriaNombre: categoria?.nombre || 'Sin categoria',
    stockActual,
    disponible: receta.length > 0 ? maxDisponible > 0 : row.disponible ?? true,
    activo: row.activo ?? true,
    creadoEn: row.creado_en ?? null,
    receta,
    maxDisponible,
  };
}

function validatePlatoInput(input: PlatoInput) {
  if (!input.nombre.trim()) throw new Error('El nombre del plato es obligatorio.');
  if (!Number.isFinite(input.precio) || input.precio < 0) throw new Error('El precio no puede ser negativo.');
  if (!Number.isFinite(input.stockActual) || input.stockActual < 0) throw new Error('El stock no puede ser negativo.');
  if (input.receta.length === 0) throw new Error('Agrega al menos un ingrediente a la receta.');

  const used = new Set<string>();
  for (const item of input.receta) {
    if (!item.ingredienteId) throw new Error('Todas las filas de receta necesitan un ingrediente.');
    if (!Number.isFinite(item.cantidadNecesaria) || item.cantidadNecesaria <= 0) {
      throw new Error('La cantidad de cada ingrediente debe ser mayor a cero.');
    }
    if (used.has(item.ingredienteId)) {
      throw new Error('No se puede repetir el mismo ingrediente en una receta.');
    }
    used.add(item.ingredienteId);
  }
}

function isMissingPhase2Schema(message: string) {
  return (
    message.includes('producto_ingredientes') ||
    message.includes('ingredientes') ||
    message.includes('productos.activo') ||
    message.includes('schema cache') ||
    message.includes('Could not find')
  );
}

async function getPlatosWithRecipe(): Promise<Plato[]> {
  const supabase = createSupabaseClientWithNoctuaRole();

  const { data, error } = await supabase
    .from('productos')
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      categoria_id,
      stock_actual,
      disponible,
      activo,
      creado_en,
      categorias(id,nombre),
      producto_ingredientes(
        id,
        ingrediente_id,
        cantidad_necesaria,
        unidad,
        ingredientes(id,nombre,unidad_medida,stock_actual,stock_minimo)
      )
    `)
    .or('activo.is.null,activo.eq.true')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as ProductoRow[]).map(mapPlato);
}

async function getPlatosFromProductosOnly(): Promise<Plato[]> {
  const supabase = createSupabaseClientWithNoctuaRole();

  const { data, error } = await supabase
    .from('productos')
    .select('id,nombre,descripcion,precio,categoria_id,stock_actual,disponible,creado_en,categorias(id,nombre)')
    .order('nombre', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProductoRow[]).map(mapPlato);
}

async function replaceRecipe(productoId: string, receta: PlatoInput['receta']): Promise<void> {
  const supabase = createSupabaseClientWithNoctuaRole();

  const { error: deleteError } = await supabase
    .from('producto_ingredientes')
    .delete()
    .eq('producto_id', productoId);

  if (deleteError) throw new Error(deleteError.message);

  const rows = receta.map((item) => ({
    producto_id: productoId,
    ingrediente_id: item.ingredienteId,
    cantidad_necesaria: item.cantidadNecesaria,
    unidad: item.unidad,
  }));

  const { error: insertError } = await supabase
    .from('producto_ingredientes')
    .insert(rows);

  if (insertError) {
    if (insertError.code === '23505') {
      throw new Error('La receta tiene ingredientes duplicados.');
    }
    throw new Error(insertError.message);
  }
}

async function recalcularDisponibilidad(productoId: string): Promise<void> {
  const supabase = createSupabaseClientWithNoctuaRole();
  const { error } = await supabase.rpc('recalcular_disponibilidad_producto', {
    p_producto_id: productoId,
  });

  if (error && !error.message.includes('Could not find the function')) {
    throw new Error(error.message);
  }
}

export const platosService = {
  async getPlatos(): Promise<Plato[]> {
    try {
      return await getPlatosWithRecipe();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingPhase2Schema(message)) {
        return getPlatosFromProductosOnly();
      }
      throw new Error(message);
    }
  },

  async getCategorias(): Promise<CategoriaPlato[]> {
    const supabase = createSupabaseClientWithNoctuaRole();

    const { data, error } = await supabase
      .from('categorias')
      .select('id,nombre')
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as CategoriaPlato[];
  },

  async createPlato(input: PlatoInput): Promise<Plato> {
    validatePlatoInput(input);
    const supabase = createSupabaseClientWithNoctuaRole();

    const { data: producto, error: productoError } = await supabase
      .from('productos')
      .insert({
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        precio: input.precio,
        categoria_id: input.categoriaId,
        stock_actual: input.stockActual,
        stock: Math.floor(input.stockActual),
        disponible: true,
        activo: true,
      })
      .select('id,nombre,descripcion,precio,categoria_id,stock_actual,disponible,activo,creado_en,categorias(id,nombre)')
      .single();

    if (productoError) throw new Error(productoError.message);

    const productoId = (producto as ProductoRow).id;
    await replaceRecipe(productoId, input.receta);
    await recalcularDisponibilidad(productoId);

    const platos = await platosService.getPlatos();
    const created = platos.find((plato) => plato.id === productoId);
    if (!created) throw new Error('El plato fue creado, pero no se pudo recargar desde Supabase.');
    return created;
  },

  async updatePlato(id: string, input: PlatoInput): Promise<Plato> {
    validatePlatoInput(input);
    const supabase = createSupabaseClientWithNoctuaRole();

    const { error } = await supabase
      .from('productos')
      .update({
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        precio: input.precio,
        categoria_id: input.categoriaId,
        stock_actual: input.stockActual,
        stock: Math.floor(input.stockActual),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    await replaceRecipe(id, input.receta);
    await recalcularDisponibilidad(id);

    const platos = await platosService.getPlatos();
    const updated = platos.find((plato) => plato.id === id);
    if (!updated) throw new Error('El plato fue actualizado, pero no se pudo recargar desde Supabase.');
    return updated;
  },

  async softDeletePlato(id: string): Promise<void> {
    const supabase = createSupabaseClientWithNoctuaRole();

    const { error } = await supabase
      .from('productos')
      .update({ activo: false, disponible: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  replaceRecipe,
  recalcularDisponibilidad,
};
