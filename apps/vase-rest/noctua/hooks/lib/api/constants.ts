import type { EstadoMesa } from "@/types/mesa";
import type { EstadoCocina } from "@/types/pedido";
import type { CategoriaProducto } from "@/types/producto";

export const COLORES_ESTADO_MESA: Record<EstadoMesa, string> = {
  libre: "bg-gray-600",
  ocupada: "bg-orange-500",
  esperando_pedido: "bg-yellow-400",
  pedido_listo: "bg-green-500",
  esperando_pago: "bg-blue-500",
  problema: "bg-red-500",
  para_cobrar: "bg-amber-600",
};

export const TEXTO_ESTADO_MESA: Record<EstadoMesa, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  esperando_pedido: "Esperando pedido",
  pedido_listo: "Pedido listo",
  esperando_pago: "Esperando pago",
  problema: "Problema",
  para_cobrar: "Para cobrar",
};

export const COLORES_ESTADO_COCINA: Record<EstadoCocina, string> = {
  pendiente: "bg-gray-500",
  preparando: "bg-red-500",
  listo: "bg-yellow-400",
  entregado: "bg-green-500",
};

export const COLORES_BORDE_COCINA: Record<EstadoCocina, string> = {
  pendiente: "border-gray-500",
  preparando: "border-red-500",
  listo: "border-yellow-400",
  entregado: "border-green-500",
};

export const TEXTO_ESTADO_COCINA: Record<EstadoCocina, string> = {
  pendiente: "Pendiente",
  preparando: "Preparando",
  listo: "Listo",
  entregado: "Entregado",
};

export const CATEGORIAS_LABELS: Record<CategoriaProducto, string> = {
  cafeteria: "Cafetería",
  restaurante: "Restaurante",
  bebidas: "Bebidas",
  combos: "Combos",
};

export const ZONAS_NAMES = [
  "TERRAZA EXTERIOR",
  "SALÓN PRINCIPAL",
  "BAR",
  "ZONA SOFÁS",
  "ZONA COCINA",
] as const;

export const TIMER_WARNING_MINUTES = 90;
export const KDS_TIMER_GREEN_MINUTES = 10;
export const KDS_TIMER_YELLOW_MINUTES = 20;