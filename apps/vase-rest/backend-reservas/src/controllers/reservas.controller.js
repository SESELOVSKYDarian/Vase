import { supabaseAdmin } from "../config/supabaseAdmin.js";

function mapMesa(mesa) {
  if (!mesa) return null;
  return {
    id: mesa.id,
    numero: mesa.numero,
    zona: mesa.zona,
    capacidad: mesa.capacidad,
    disponible: mesa.disponible,
    estado: mesa.estado,
  };
}

function mapReserva(reserva) {
  return {
    id: reserva.id,
    nombreCliente: reserva.nombre_cliente,
    telefono: reserva.telefono,
    email: reserva.email,
    cantidadPersonas: reserva.cantidad_personas,
    fechaHoraInicio: reserva.fecha_hora_inicio,
    fechaHoraFin: reserva.fecha_hora_fin,
    estado: reserva.estado,
    mesaId: reserva.mesa_id,
    mesa: mapMesa(reserva.mesas),
    createdAt: reserva.created_at,
  };
}

/**
 * Crea una reserva validando capacidad y superposicion horaria.
 */
export const crearReserva = async (req, res) => {
  try {
    const {
      nombreCliente,
      telefono,
      email,
      cantidadPersonas,
      fechaHoraInicio,
      duracionMinutos,
      mesaId,
    } = req.body;

    if (!nombreCliente || !telefono || !cantidadPersonas || !fechaHoraInicio || !mesaId) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para crear la reserva",
      });
    }

    const inicio = new Date(fechaHoraInicio);
    const fin = new Date(
      inicio.getTime() + (Number(duracionMinutos) || 120) * 60000
    );

    if (Number.isNaN(inicio.getTime())) {
      return res.status(400).json({ mensaje: "La fecha de inicio no es valida" });
    }

    const { data: mesa, error: mesaError } = await supabaseAdmin
      .from("mesas")
      .select("*")
      .eq("id", mesaId)
      .single();

    if (mesaError || !mesa) {
      return res.status(404).json({ mensaje: "La mesa seleccionada no existe" });
    }

    if (Number(mesa.capacidad || 0) < Number(cantidadPersonas)) {
      return res.status(400).json({
        mensaje: "La mesa seleccionada no tiene capacidad suficiente",
      });
    }

    const { data: superpuestas, error: superpuestasError } = await supabaseAdmin
      .from("reservas")
      .select("id")
      .eq("mesa_id", mesaId)
      .in("estado", ["pendiente", "confirmada", "PENDIENTE", "CONFIRMADA"])
      .lt("fecha_hora_inicio", fin.toISOString())
      .gt("fecha_hora_fin", inicio.toISOString());

    if (superpuestasError) throw new Error(superpuestasError.message);

    if ((superpuestas || []).length > 0) {
      return res.status(400).json({
        mensaje: "La mesa ya tiene una reserva en ese horario",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("reservas")
      .insert({
        nombre_cliente: nombreCliente,
        telefono,
        email: email || null,
        cantidad_personas: Number(cantidadPersonas),
        fecha_hora_inicio: inicio.toISOString(),
        fecha_hora_fin: fin.toISOString(),
        mesa_id: mesaId,
        estado: "pendiente",
      })
      .select("*, mesas(*)")
      .single();

    if (error) throw new Error(error.message);

    return res.status(201).json({
      mensaje: "Reserva creada correctamente",
      reserva: mapReserva(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al crear la reserva",
      error: error.message,
    });
  }
};

/**
 * Lista reservas ordenadas por horario de inicio.
 */
export const obtenerReservas = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select("*, mesas(*)")
      .order("fecha_hora_inicio", { ascending: true });

    if (error) throw new Error(error.message);

    const reservas = (data || []).map(mapReserva);

    return res.json({
      mensaje: "Reservas obtenidas correctamente",
      total: reservas.length,
      reservas,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener las reservas",
      error: error.message,
    });
  }
};

export const obtenerReservaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select("*, mesas(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ mensaje: "Reserva no encontrada" });
    }

    return res.json({
      mensaje: "Reserva encontrada",
      reserva: mapReserva(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener la reserva",
      error: error.message,
    });
  }
};

/**
 * Marca una reserva como cancelada sin borrar su historial.
 */
export const cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", id)
      .select("*, mesas(*)")
      .single();

    if (error || !data) {
      return res.status(404).json({ mensaje: "Reserva no encontrada" });
    }

    return res.json({
      mensaje: "Reserva cancelada correctamente",
      reserva: mapReserva(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cancelar la reserva",
      error: error.message,
    });
  }
};
