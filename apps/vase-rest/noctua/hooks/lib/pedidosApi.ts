import { apiFetch } from "./api/client";
import type { Pedido, EstadoCocina } from "@/types/pedido";

interface CrearPedidoDTO {
  mesaId: number;
  personas: number;
  items: {
    productoId: number;
    cantidad: number;
    notas?: string;
  }[];
}

// Mock local de pedidos para el hook antiguo
let mockPedidosBackend: Pedido[] = [
  {
    id: "1",
    mesaId: "2",
    numeroMesa: 2,
    zona: "SALÓN PRINCIPAL",
    items: [
      { productoId: "2", nombre: "Hamburguesa Simple", cantidad: 2, precioUnitario: 8500, subtotal: 17000 },
      { productoId: "3", nombre: "Agua Mineral", cantidad: 2, precioUnitario: 1500, subtotal: 3000 }
    ],
    total: 20000,
    estado: "preparando",
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    personas: 2
  }
];

export async function obtenerPedidos(): Promise<Pedido[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [...mockPedidosBackend];
}

export async function crearPedido(data: CrearPedidoDTO) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const nuevoPedido: Pedido = {
    id: String(Date.now()),
    mesaId: String(data.mesaId),
    numeroMesa: data.mesaId,
    zona: "SALÓN PRINCIPAL",
    items: data.items.map(item => ({
      productoId: String(item.productoId),
      nombre: "Producto",
      cantidad: item.cantidad,
      precioUnitario: 1000,
      subtotal: item.cantidad * 1000,
      notas: item.notas
    })),
    total: data.items.reduce((acc, item) => acc + (item.cantidad * 1000), 0),
    estado: "pendiente",
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    personas: data.personas
  };
  mockPedidosBackend.push(nuevoPedido);
  return { success: true, pedido: nuevoPedido };
}

export async function actualizarEstadoPedido(
  pedidoId: string,
  estado: EstadoCocina
) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  mockPedidosBackend = mockPedidosBackend.map(p => 
    p.id === pedidoId ? { ...p, estado, actualizadoEn: new Date() } : p
  );
  return { success: true };
}