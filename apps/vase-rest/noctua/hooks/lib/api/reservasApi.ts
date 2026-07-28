import { supabase } from "../supabaseClient";

export interface Reserva {
  id: string;
  nombre_cliente: string;
  email_cliente?: string;
  telefono?: string;
  cantidad_personas: number;
  fecha: string;
  hora: string;
  estado: "activa" | "cancelada" | "completada";
  codigo_reserva: string;
  mesa_id?: string;
  mesas_ids?: string[];
  creada_en: string;
  cancelada_en?: string | null;
}

export async function obtenerReservas(): Promise<Reserva[]> {
  const { data, error } = await supabase
    .from("reservas")
    .select("id, nombre_cliente, email_cliente, email, telefono, cantidad_personas, fecha, hora, estado, codigo_reserva, mesa_id, mesas_ids, creada_en, cancelada_en")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  if (error) {
    console.error("Error al obtener reservas de Supabase:", error);
    throw new Error(error.message);
  }

  return (data || []).map((r) => ({
    id: String(r.id),
    nombre_cliente: r.nombre_cliente || "Sin nombre",
    email_cliente: r.email_cliente ?? r.email ?? undefined,
    telefono: r.telefono ?? undefined,
    cantidad_personas: r.cantidad_personas ?? 1,
    fecha: r.fecha,
    hora: r.hora,
    estado: (r.estado ?? "activa") as Reserva["estado"],
    codigo_reserva: r.codigo_reserva ?? "",
    mesa_id: r.mesa_id ? String(r.mesa_id) : undefined,
    mesas_ids: Array.isArray(r.mesas_ids) ? r.mesas_ids.map(String) : undefined,
    creada_en: r.creada_en,
    cancelada_en: r.cancelada_en ?? null,
  }));
}

export async function cancelarReserva(id: string): Promise<void> {
  const { error } = await supabase
    .from("reservas")
    .update({ estado: "cancelada", cancelada_en: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error al cancelar reserva:", error);
    throw new Error(error.message);
  }
}

export async function completarReserva(id: string): Promise<void> {
  const { error } = await supabase
    .from("reservas")
    .update({ estado: "completada" })
    .eq("id", id);

  if (error) {
    console.error("Error al completar reserva:", error);
    throw new Error(error.message);
  }
}
