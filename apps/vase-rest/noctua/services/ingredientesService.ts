import { createSupabaseClientWithNoctuaRole } from '@/services/supabaseRoleClient';
import type { Ingrediente } from '@/types/platos';

type IngredienteRow = {
  id: string;
  nombre: string;
  unidad_medida: string;
  stock_actual: number | string | null;
  stock_minimo: number | string | null;
  creado_en?: string | null;
};

function mapIngrediente(row: IngredienteRow): Ingrediente {
  return {
    id: row.id,
    nombre: row.nombre,
    unidadMedida: row.unidad_medida,
    stockActual: Number(row.stock_actual ?? 0),
    stockMinimo: Number(row.stock_minimo ?? 0),
    creadoEn: row.creado_en ?? null,
  };
}

function buildSupabaseErrorMessage(errorMessage: string) {
  if (errorMessage.includes("Could not find the table") || errorMessage.includes("schema cache")) {
    return 'La tabla ingredientes no existe todavia. Aplicar la migracion Phase 2 antes de usar recetas.';
  }
  return errorMessage;
}

export const ingredientesService = {
  async getIngredientes(): Promise<Ingrediente[]> {
    const supabase = createSupabaseClientWithNoctuaRole();

    const { data, error } = await supabase
      .from('ingredientes')
      .select('id,nombre,unidad_medida,stock_actual,stock_minimo,creado_en')
      .order('nombre', { ascending: true });

    if (error) throw new Error(buildSupabaseErrorMessage(error.message));

    return ((data ?? []) as IngredienteRow[]).map(mapIngrediente);
  },

  async createIngrediente(input: {
    nombre: string;
    unidadMedida: string;
    stockActual: number;
    stockMinimo: number;
  }): Promise<Ingrediente> {
    const supabase = createSupabaseClientWithNoctuaRole();

    const { data, error } = await supabase
      .from('ingredientes')
      .insert({
        nombre: input.nombre.trim(),
        unidad_medida: input.unidadMedida.trim(),
        stock_actual: input.stockActual,
        stock_minimo: input.stockMinimo,
      })
      .select('id,nombre,unidad_medida,stock_actual,stock_minimo,creado_en')
      .single();

    if (error) throw new Error(buildSupabaseErrorMessage(error.message));

    return mapIngrediente(data as IngredienteRow);
  },
};
