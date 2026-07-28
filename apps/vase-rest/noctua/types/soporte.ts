export type TicketCategoria = 'bug' | 'consulta' | 'mejora' | 'urgente';
export type TicketEstado = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';
export type TicketPrioridad = 'baja' | 'normal' | 'alta' | 'critica';

export interface TicketSoporte {
  id: string;
  usuario_id: string | null;
  auth_user_id: string | null;
  nombre_usuario: string | null;
  rol_usuario: string | null;
  asunto: string;
  categoria: TicketCategoria;
  descripcion: string;
  estado: TicketEstado;
  prioridad: TicketPrioridad;
  respuesta_interna: string | null;
  creado_en: string;
  actualizado_en: string;
  resuelto_en: string | null;
}

export interface CreateTicketPayload {
  asunto: string;
  categoria: TicketCategoria;
  descripcion: string;
}

/** Payload enviado al API route de email */
export interface EnviarEmailTicketPayload {
  ticketId: string;
  asunto: string;
  categoria: string;
  descripcion: string;
  nombreUsuario: string;
  rolUsuario: string;
  creadoEn: string;
}
