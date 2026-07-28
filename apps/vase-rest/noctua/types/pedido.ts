export type EstadoCocina = 'pendiente' | 'preparando' | 'listo' | 'entregado';

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas?: string;
}

export interface Pedido {
  id: string;
  mesaId: string;
  numeroMesa: number;
  zona: string;
  items: ItemPedido[];
  total: number;
  estado: EstadoCocina;
  creadoEn: Date;
  actualizadoEn: Date;
  personas: number;
}
