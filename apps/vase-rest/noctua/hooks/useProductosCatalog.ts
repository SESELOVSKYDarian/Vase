// Catálogo de productos reales (Supabase, vía backend) para la toma de pedidos.
// Usa los productos persistidos —no los platos mock— para que los IDs resuelvan
// en el backend al agregar ítems al pedido.
'use client';

import { useQuery } from '@tanstack/react-query';
import { obtenerProductos } from '@/hooks/lib/api/productosApi';
import type { Producto } from '@/types/producto';

export interface CategoriaConProductos {
  id: string;
  nombre: string;
  productos: Producto[];
}

const SIN_CATEGORIA = 'Sin categoría';

export function useProductosCatalog() {
  const query = useQuery({
    queryKey: ['productos', 'catalogo', 'disponibles'],
    // Solo productos disponibles: los que se agotan (disponible=false vía descuento
    // de stock) desaparecen del catálogo en el siguiente refetch (~near real-time).
    queryFn: () => obtenerProductos({ soloDisponibles: true }),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  // Defensa extra en cliente por si el backend devolviera alguno no disponible
  const productos = (query.data ?? []).filter((p) => p.disponible !== false);

  // Agrupar por categoría, preservando el orden de aparición
  const categorias: CategoriaConProductos[] = [];
  const index = new Map<string, CategoriaConProductos>();
  for (const p of productos) {
    const catId = p.categoria?.id ?? p.categoria_id ?? SIN_CATEGORIA;
    const catNombre = p.categoria?.nombre ?? SIN_CATEGORIA;
    let grupo = index.get(catId);
    if (!grupo) {
      grupo = { id: catId, nombre: catNombre, productos: [] };
      index.set(catId, grupo);
      categorias.push(grupo);
    }
    grupo.productos.push(p);
  }

  return {
    productos,
    categorias,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
