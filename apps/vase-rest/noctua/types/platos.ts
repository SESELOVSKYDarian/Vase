export interface Ingrediente {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  creadoEn?: string | null;
}

export interface PlatoRecetaItem {
  id?: string;
  ingredienteId: string;
  ingredienteNombre: string;
  cantidadNecesaria: number;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
}

export interface Plato {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoriaId: string | null;
  categoriaNombre: string;
  stockActual: number;
  disponible: boolean;
  activo: boolean;
  creadoEn?: string | null;
  receta: PlatoRecetaItem[];
  maxDisponible: number;
}

export interface PlatoInput {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoriaId: string | null;
  stockActual: number;
  receta: {
    ingredienteId: string;
    cantidadNecesaria: number;
    unidad: string;
  }[];
}

export interface CategoriaPlato {
  id: string;
  nombre: string;
}
