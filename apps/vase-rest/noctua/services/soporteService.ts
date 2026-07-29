import { supabase } from '@/hooks/lib/supabaseClient';
import type {
  TicketSoporte,
  TicketEstado,
  CreateTicketPayload,
} from '@/types/soporte';

/** Fila tal como viene de Supabase */
type TicketRow = {
  id: string;
  usuario_id: string | null;
  auth_user_id: string | null;
  nombre_usuario: string | null;
  rol_usuario: string | null;
  asunto: string;
  categoria: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  respuesta_interna: string | null;
  creado_en: string;
  actualizado_en: string;
  resuelto_en: string | null;
};

function mapTicket(row: TicketRow): TicketSoporte {
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    auth_user_id: row.auth_user_id,
    nombre_usuario: row.nombre_usuario,
    rol_usuario: row.rol_usuario,
    asunto: row.asunto,
    categoria: row.categoria as TicketSoporte['categoria'],
    descripcion: row.descripcion,
    estado: row.estado as TicketSoporte['estado'],
    prioridad: row.prioridad as TicketSoporte['prioridad'],
    respuesta_interna: row.respuesta_interna,
    creado_en: row.creado_en,
    actualizado_en: row.actualizado_en,
    resuelto_en: row.resuelto_en,
  };
}

/** Obtener los tickets del usuario autenticado (RLS filtra automáticamente) */
export async function getMyTickets(): Promise<TicketSoporte[]> {
  const { data, error } = await supabase
    .from('tickets_soporte')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error al obtener tickets:', error.message || error);
    throw new Error('No se pudieron cargar los tickets de soporte.');
  }

  return ((data ?? []) as TicketRow[]).map(mapTicket);
}

/** Obtener todos los tickets — solo accesible para admins (RLS lo garantiza) */
export async function getAllTickets(): Promise<TicketSoporte[]> {
  const { data, error } = await supabase
    .from('tickets_soporte')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error al obtener todos los tickets:', error.message || error);
    throw new Error('No se pudieron cargar los tickets.');
  }

  return ((data ?? []) as TicketRow[]).map(mapTicket);
}

/** Crear un ticket nuevo en Supabase */
export async function createTicket(
  payload: CreateTicketPayload,
  user: { id: string | null; auth_user_id: string | null; nombre: string; rol: string }
): Promise<TicketSoporte> {
  const { data, error } = await supabase
    .from('tickets_soporte')
    .insert([
      {
        usuario_id: user.id,
        auth_user_id: user.auth_user_id,
        nombre_usuario: user.nombre,
        rol_usuario: user.rol,
        asunto: payload.asunto,
        categoria: payload.categoria,
        descripcion: payload.descripcion,
      },
    ])
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error al crear ticket:', error.message || error);
    throw new Error('No se pudo crear el ticket de soporte.');
  }

  if (!data) {
    throw new Error('No se obtuvo respuesta al crear el ticket.');
  }

  return mapTicket(data as TicketRow);
}

/** Actualizar el estado de un ticket — solo admins (RLS lo garantiza) */
export async function updateTicketEstado(
  ticketId: string,
  estado: TicketEstado,
  respuestaInterna?: string
): Promise<void> {
  const cambios: Partial<TicketRow> & { resuelto_en?: string | null } = {
    estado,
    actualizado_en: new Date().toISOString(),
    ...(respuestaInterna !== undefined && { respuesta_interna: respuestaInterna }),
    ...(estado === 'resuelto' && { resuelto_en: new Date().toISOString() }),
    ...(estado !== 'resuelto' && { resuelto_en: null }),
  };

  const { error } = await supabase
    .from('tickets_soporte')
    .update(cambios)
    .eq('id', ticketId);

  if (error) {
    console.error('Error al actualizar ticket:', error.message || error);
    throw new Error('No se pudo actualizar el estado del ticket.');
  }
}
