import type { Pedido, EstadoCocina } from "@/types/pedido";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(json.mensaje || json.error || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error(`ERROR DE CONEXIÓN: No se pudo contactar con el backend en ${API_URL}${endpoint}. ¿Está el servidor Express corriendo?`);
    } else {
      console.error(`API fetch failed for ${endpoint}:`, error);
    }
    throw error;
  }
}

// ── Mapea la respuesta del backend Express al tipo Pedido del frontend ─────────

function mapBackendPedido(p: {
  id: string;
  mesaId?: string;
  mesa_id?: string;
  estado: string;
  comensales?: number | null;
  total: number;
  subtotal?: number;
  abiertoEn?: string;
  abierto_en?: string;
  createdAt?: string;
  created_at?: string;
  mesa?: { id?: string; numero: number; zona?: string };
  items?: {
    productoId?: string;
    producto_id?: string;
    producto?: { nombre: string };
    nombre?: string;
    cantidad: number;
    precioUnitario?: number;
    precio_unitario?: number;
    subtotal: number;
    notas?: string;
  }[];
  detalles?: {
    productoId?: string;
    producto_id?: string;
    producto?: { nombre: string };
    nombre?: string;
    cantidad: number;
    precioUnitario?: number;
    precio_unitario?: number;
    subtotal: number;
    notas?: string;
  }[];
}): Pedido {
  const items = p.items || p.detalles || [];
  return {
    id: p.id,
    mesaId: p.mesaId || p.mesa_id || "",
    numeroMesa: p.mesa?.numero || 0,
    zona: p.mesa?.zona || "SALÓN PRINCIPAL",
    items: items.map((i) => ({
      productoId: i.productoId || i.producto_id || "",
      nombre: i.producto?.nombre || i.nombre || "Producto",
      cantidad: Number(i.cantidad),
      precioUnitario: Number(i.precioUnitario ?? i.precio_unitario ?? 0),
      subtotal: Number(i.subtotal),
      notas: i.notas,
    })),
    total: Number(p.total || p.subtotal || 0),
    estado: (p.estado || "pendiente") as EstadoCocina,
    creadoEn: new Date(p.abiertoEn || p.abierto_en || p.createdAt || p.created_at || new Date().toISOString()),
    actualizadoEn: new Date(),
    // `comensales` es la fuente persistida; `personas` se conserva por compatibilidad
    personas: p.comensales != null ? Number(p.comensales) : 1,
  };
}

// ── Lecturas: a través del backend Express (bypassea RLS) ─────────────────────

export async function obtenerPedidos(): Promise<Pedido[]> {
  try {
    const data = await apiFetch<{ pedidos: unknown[] }>("/pedidos");
    const pedidos = data.pedidos || [];
    return pedidos.map((p) => mapBackendPedido(p as Parameters<typeof mapBackendPedido>[0]));
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return [];
  }
}

// Estados activos de cocina + entregado (para que siga visible en la mesa)
export async function obtenerPedidosActivos(): Promise<Pedido[]> {
  try {
    const data = await apiFetch<{ pedidos: unknown[] }>(
      "/pedidos?estado=pendiente,preparando,listo,entregado"
    );
    const pedidos = data.pedidos || [];
    return pedidos.map((p) => mapBackendPedido(p as Parameters<typeof mapBackendPedido>[0]));
  } catch (error) {
    console.error("Error al obtener pedidos activos:", error);
    return [];
  }
}

export async function obtenerPedidosPorFecha(inicio: string, fin: string): Promise<Pedido[]> {
  try {
    const data = await apiFetch<{ pedidos: unknown[] }>(`/pedidos?desde=${inicio}&hasta=${fin}`);
    const pedidos = data.pedidos || [];
    return pedidos.map((p) => mapBackendPedido(p as Parameters<typeof mapBackendPedido>[0]));
  } catch (error) {
    console.error("Error al obtener pedidos por fecha:", error);
    return [];
  }
}

// ── Escrituras: a través del backend Express (bypassea RLS) ──────────────────

export async function crearPedido(data: {
  mesaId: string;
  numeroMesa: number;
  zona: string;
  personas: number;
  total: number;
  items: {
    productoId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    notas?: string;
  }[];
}): Promise<{ success: boolean; pedido: Pedido }> {
  // 1. Crear el pedido via backend
  const { pedido: pedidoCreado } = await apiFetch<{ pedido: Parameters<typeof mapBackendPedido>[0] }>(
    "/pedidos",
    {
      method: "POST",
      body: JSON.stringify({ mesaId: data.mesaId, comensales: data.personas }),
    }
  );

  // 2. Agregar cada item via backend
  for (const item of data.items) {
    await apiFetch(`/pedidos/${pedidoCreado.id}/productos`, {
      method: "POST",
      body: JSON.stringify({
        productoId: item.productoId,
        cantidad: item.cantidad,
        notas: item.notas,
      }),
    });
  }

  // 3. Obtener el pedido completo actualizado via backend
  try {
    const { pedido: fullPedido } = await apiFetch<{ pedido: Parameters<typeof mapBackendPedido>[0] }>(
      `/pedidos/${pedidoCreado.id}`
    );
    return { success: true, pedido: mapBackendPedido(fullPedido) };
  } catch {
    return { success: true, pedido: mapBackendPedido(pedidoCreado) };
  }
}

type BackendPedido = Parameters<typeof mapBackendPedido>[0];

// Abre (o reutiliza) el pedido de una mesa. Devuelve el pedido crudo del backend
// (incluye items/detalles) para poder distinguir un pedido preexistente de uno nuevo.
export async function abrirPedidoRow(mesaId: string, comensales?: number): Promise<BackendPedido> {
  const { pedido } = await apiFetch<{ pedido: BackendPedido }>("/pedidos", {
    method: "POST",
    body: JSON.stringify({ mesaId, comensales }),
  });
  return pedido;
}

// Agrega un producto a un pedido existente. Lanza Error con el mensaje del backend
// (ej: "No hay stock suficiente de X") si el descuento de stock falla.
export async function agregarProductoAPedido(
  pedidoId: string,
  item: { productoId: string; cantidad: number; notas?: string }
): Promise<void> {
  await apiFetch(`/pedidos/${pedidoId}/productos`, {
    method: "POST",
    body: JSON.stringify({ productoId: item.productoId, cantidad: item.cantidad, notas: item.notas }),
  });
}

export async function obtenerPedidoPorId(pedidoId: string): Promise<Pedido> {
  const { pedido } = await apiFetch<{ pedido: BackendPedido }>(`/pedidos/${pedidoId}`);
  return mapBackendPedido(pedido);
}

export async function actualizarEstadoPedido(
  pedidoId: string,
  estado: EstadoCocina
) {
  await apiFetch(`/pedidos/${pedidoId}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });

  return { success: true };
}

// Actualiza los comensales de un pedido ya persistido en el backend.
export async function actualizarComensales(pedidoId: string, comensales: number) {
  await apiFetch(`/pedidos/${pedidoId}/comensales`, {
    method: "PATCH",
    body: JSON.stringify({ comensales }),
  });

  return { success: true };
}

export async function eliminarPedido(pedidoId: string) {
  await apiFetch(`/pedidos/${pedidoId}`, { method: "DELETE" });
  return { success: true };
}
