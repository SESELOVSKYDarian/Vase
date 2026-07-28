import { supabase } from "../supabaseClient";
import type { Mesa, EstadoMesa } from "@/types/mesa";

interface MesaBackend {
  id: number;
  numero: number;
  capacidad: number;
  ubicacion?: string | null;
  zona?: string | null;
  disponible?: boolean;
  estado?: string;

  estadoActual?: string;
  estadoPedido?: string | null;
  pedidoActual?: unknown;
  reservaActual?: unknown;

  pos_x?: number | null;
  pos_y?: number | null;
  personas?: number | null;
  pedido_id?: number | null;
  creada_en?: string | null;
}

function mapEstadoMesa(mesa: MesaBackend): EstadoMesa {
  if (mesa.estadoActual === "OCUPADA") return "ocupada";
  if (mesa.estadoActual === "RESERVADA") return "esperando_pedido";
  if (mesa.estadoActual === "FUERA_DE_SERVICIO") return "problema";

  if (mesa.estadoPedido === "PENDIENTE") return "esperando_pedido";
  if (mesa.estadoPedido === "PREPARANDO") return "ocupada";
  if (mesa.estadoPedido === "LISTO") return "pedido_listo";
  if (mesa.estadoPedido === "lista_para_cobrar") return "para_cobrar";

  if (mesa.estado === "libre") return "libre";
  if (mesa.estado === "ocupada") return "ocupada";
  if (mesa.estado === "reservada") return "esperando_pedido";
  if (mesa.estado === "esperando_pedido") return "esperando_pedido";
  if (mesa.estado === "pedido_listo") return "pedido_listo";
  if (mesa.estado === "problema") return "problema";

  if (mesa.disponible === true) return "libre";
  if (mesa.disponible === false) return "problema";

  return "libre";
}

export async function obtenerMesas(): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from("mesas")
    .select("id, numero, capacidad, zona, disponible, estado, pos_x, pos_y, creada_en");

  if (error) {
    console.error("Error al obtener mesas de Supabase:", error);
    throw new Error(error.message);
  }

  return (data || []).map((mesa: MesaBackend) => ({
    id: String(mesa.id),
    numero: mesa.numero,
    zona: mesa.zona || mesa.ubicacion || "SALÓN PRINCIPAL",
    estado: mapEstadoMesa(mesa),
    capacidad: mesa.capacidad || 4,
    posicion: {
      x: mesa.pos_x || 0,
      y: mesa.pos_y || 0,
    },
    mesasUnidas: [],
    personas: mesa.personas || undefined,
    pedidoId: mesa.pedido_id ? String(mesa.pedido_id) : undefined,
    timerInicio: undefined, // se gestiona en el store al cambiar estado
  }));
}

export async function crearMesa(data: {
  numero: number;
  capacidad: number;
  ubicacion: string;
}) {
  const { data: newMesa, error } = await supabase
    .from("mesas")
    .insert([
      {
        numero: data.numero,
        capacidad: data.capacidad,
        zona: data.ubicacion,
        estado: "libre",
        pos_x: 0,
        pos_y: 0,
        forma: "cuadrada",
        piso: "baja",
      },
    ])
    .select("id, numero, capacidad, zona, disponible, estado, pos_x, pos_y, creada_en")
    .single();

  if (error) {
    console.error("Error al crear mesa:", error);
    throw new Error(error.message);
  }

  return {
    success: true,
    mesa: {
      id: String(newMesa.id),
      numero: newMesa.numero,
      zona: newMesa.zona || "SALÓN PRINCIPAL",
      estado: mapEstadoMesa(newMesa),
      capacidad: newMesa.capacidad || 4,
      posicion: {
        x: newMesa.pos_x || 0,
        y: newMesa.pos_y || 0,
      },
      mesasUnidas: [],
    },
  };
}

export async function actualizarMesa(
  id: string,
  data: Partial<{
    numero: number;
    capacidad: number;
    ubicacion: string;
    zona: string;
    posicion: { x: number; y: number };
    personas: number | null;
  }>
) {
  const queryId = Number.isNaN(Number(id)) ? id : Number(id);
  const cambios: Record<string, unknown> = {};

  if (data.numero !== undefined) cambios.numero = data.numero;
  if (data.capacidad !== undefined) cambios.capacidad = data.capacidad;
  if (data.ubicacion !== undefined || data.zona !== undefined) {
    cambios.zona = data.zona || data.ubicacion;
  }
  if (data.posicion !== undefined) {
    cambios.pos_x = data.posicion.x;
    cambios.pos_y = data.posicion.y;
  }


  const { data: mesaActualizada, error } = await supabase
    .from("mesas")
    .update(cambios)
    .eq("id", queryId)
    .select("id, numero, capacidad, zona, disponible, estado, pos_x, pos_y, creada_en")
    .single();

  if (error) {
    console.error("Error al actualizar mesa en Supabase:", error);
    throw new Error(error.message);
  }

  return {
    success: true,
    mesa: {
      id: String(mesaActualizada.id),
      numero: mesaActualizada.numero,
      zona: mesaActualizada.zona || mesaActualizada.ubicacion || "SALÓN PRINCIPAL",
      estado: mapEstadoMesa(mesaActualizada),
      capacidad: mesaActualizada.capacidad || 4,
      posicion: {
        x: mesaActualizada.pos_x || 0,
        y: mesaActualizada.pos_y || 0,
      },
      mesasUnidas: [],
      personas: mesaActualizada.personas || undefined,
      pedidoId: mesaActualizada.pedido_id
        ? String(mesaActualizada.pedido_id)
        : undefined,
      timerInicio: mesaActualizada.creada_en
        ? new Date(mesaActualizada.creada_en)
        : undefined,
    } satisfies Mesa,
  };
}

export async function eliminarMesa(id: string) {
  const queryId = Number.isNaN(Number(id)) ? id : Number(id);

  const { error } = await supabase
    .from("mesas")
    .delete()
    .eq("id", queryId);

  if (error) {
    console.error("Error al eliminar mesa en Supabase:", error);
    throw new Error(error.message);
  }

  return { success: true };
}

export async function actualizarEstadoMesa(id: string, estado: EstadoMesa) {
  const queryId = Number.isNaN(Number(id)) ? id : Number(id);
  const disponible = estado === "libre";
  // "para_cobrar" no existe en el enum de la DB → se persiste como "ocupada"
  const estadoDB = estado === "para_cobrar" ? "ocupada" : estado;
  const cambios: Record<string, unknown> = {
    estado: estadoDB,
    disponible,
  };

  if (estado === "libre") {
    // personas and pedido_id are not in the db
  }

  const { data: mesaActualizada, error } = await supabase
    .from("mesas")
    .update(cambios)
    .eq("id", queryId)
    .select("id, numero, capacidad, zona, disponible, estado, pos_x, pos_y, creada_en")
    .single();

  if (error) {
    console.error("Error al actualizar estado de mesa en Supabase:", error);
    throw new Error(error.message);
  }

  return {
    success: true,
    mesa: {
      id: String(mesaActualizada.id),
      numero: mesaActualizada.numero,
      zona: mesaActualizada.zona || mesaActualizada.ubicacion || "SALÓN PRINCIPAL",
      estado: mapEstadoMesa(mesaActualizada),
      capacidad: mesaActualizada.capacidad || 4,
      posicion: {
        x: mesaActualizada.pos_x || 0,
        y: mesaActualizada.pos_y || 0,
      },
      mesasUnidas: [],
      personas: mesaActualizada.personas || undefined,
      pedidoId: mesaActualizada.pedido_id
        ? String(mesaActualizada.pedido_id)
        : undefined,
      timerInicio: mesaActualizada.creada_en
        ? new Date(mesaActualizada.creada_en)
        : undefined,
    } satisfies Mesa,
  };
}
