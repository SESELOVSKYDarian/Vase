import { supabase } from "../supabaseClient";
import type { Producto, Categoria } from "@/types/producto";

type ProductoRow = {
  id: string | number;
  nombre: string;
  precio: number | string;
  categoria_id: string;
  stock?: number | null;
  disponible?: boolean | null;
  categorias?: { id: string; nombre: string } | { id: string; nombre: string }[] | null;
};

function mapCategoriaRelacion(categorias: ProductoRow["categorias"]): Categoria | undefined {
  const categoria = Array.isArray(categorias) ? categorias[0] : categorias;
  return categoria ? { id: String(categoria.id), nombre: categoria.nombre } : undefined;
}

function mapProducto(producto: ProductoRow): Producto {
  return {
    id: String(producto.id),
    nombre: producto.nombre,
    precio: Number(producto.precio),
    categoria_id: producto.categoria_id,
    categoria: mapCategoriaRelacion(producto.categorias),
    stock: producto.stock ?? 0,
    disponible: producto.disponible ?? true,
  };
}

import { apiFetch } from "./client";

export async function obtenerCategorias(): Promise<Categoria[]> {
  try {
    const data = await apiFetch<{ categorias: Categoria[] }>("/categorias");
    return data.categorias || [];
  } catch (error: any) {
    console.error("Error al obtener categorías del backend:", error);
    return [];
  }
}

export async function obtenerProductos(opts?: { soloDisponibles?: boolean }): Promise<Producto[]> {
  try {
    const qs = opts?.soloDisponibles ? "?disponible=true" : "";
    const data = await apiFetch<{ productos: Producto[] }>(`/productos${qs}`);
    return data.productos || [];
  } catch (error: any) {
    console.error("Error al obtener productos del backend:", error);
    return [];
  }
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  try {
    const data = await apiFetch<{ categoria: Categoria }>("/categorias", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    });
    return data.categoria;
  } catch (error: any) {
    console.error("Error al crear categoría a través del backend:", error);
    throw new Error(error.message);
  }
}

export async function crearProducto(data: {
  nombre: string;
  precio: number;
  categoria_id: string;
  stock: number;
  disponible: boolean;
}) {
  try {
    const response = await apiFetch<{ producto: Producto }>("/productos", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return { 
      success: true, 
      producto: response.producto
    };
  } catch (error: any) {
    console.error("Error al crear producto a través del backend:", error);
    throw new Error(error.message);
  }
}

export async function eliminarProducto(id: string) {
  try {
    await apiFetch(`/productos/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar producto a través del backend:", error);
    throw new Error(error.message);
  }
}

export async function actualizarCategoria(id: string, updates: Partial<Categoria>) {
  try {
    const data = await apiFetch<{ categoria: Categoria }>(`/categorias/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return data.categoria;
  } catch (error: any) {
    console.error("Error al actualizar categoría a través del backend:", error);
    throw new Error(error.message);
  }
}

export async function eliminarCategoria(id: string) {
  try {
    await apiFetch(`/categorias/${id}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar categoría a través del backend:", error);
    throw new Error(error.message);
  }
}

export async function actualizarProducto(id: string, updates: Partial<Producto>) {
  try {
    const data = await apiFetch<{ producto: Producto }>(`/productos/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return data.producto;
  } catch (error: any) {
    console.error("Error al actualizar producto a través del backend:", error);
    throw new Error(error.message);
  }
}
