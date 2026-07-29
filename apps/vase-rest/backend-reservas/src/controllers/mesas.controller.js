import { supabaseAdmin } from "../config/supabaseAdmin.js";

function mapMesa(mesa) {
  return {
    id: mesa.id,
    numero: mesa.numero,
    capacidad: mesa.capacidad,
    zona: mesa.zona,
    ubicacion: mesa.zona || mesa.ubicacion,
    disponible: mesa.disponible,
    estado: mesa.estado,
    createdAt: mesa.created_at,
  };
}

/**
 * Crea una mesa disponible para operar en salon.
 */
export const crearMesa = async (req, res) => {
  try {
    const { numero, capacidad, ubicacion, zona } = req.body;

    if (!numero || !capacidad) {
      return res.status(400).json({
        mensaje: "El numero y la capacidad de la mesa son obligatorios",
      });
    }

    const { data: existente } = await supabaseAdmin
      .from("mesas")
      .select("id")
      .eq("numero", Number(numero))
      .maybeSingle();

    if (existente) {
      return res.status(400).json({
        mensaje: "Ya existe una mesa con ese numero",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("mesas")
      .insert({
        numero: Number(numero),
        capacidad: Number(capacidad),
        zona: zona || ubicacion || null,
        disponible: true,
        estado: "libre",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return res.status(201).json({
      mensaje: "Mesa creada correctamente",
      mesa: mapMesa(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al crear la mesa",
      error: error.message,
    });
  }
};

/**
 * Elimina una mesa limpiando dependencias directas de pedidos.
 */
export const eliminarMesa = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener todos los pedidos vinculados a esta mesa
    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .eq("mesa_id", id);

    const pedidoIds = (pedidos || []).map((p) => p.id);

    if (pedidoIds.length > 0) {
      // 2. Facturas (referencia pedidos y pagos)
      await supabaseAdmin.from("facturas").delete().in("pedido_id", pedidoIds);
      // 3. Movimientos de stock (referencia pedidos)
      await supabaseAdmin.from("movimientos_stock").delete().in("pedido_id", pedidoIds);
      // 4. Items de pedido (referencia pedidos)
      await supabaseAdmin.from("pedido_items").delete().in("pedido_id", pedidoIds);
      // 5. Pedidos
      const { error: pedidosError } = await supabaseAdmin
        .from("pedidos")
        .delete()
        .in("id", pedidoIds);
      if (pedidosError) throw new Error(pedidosError.message);
    }

    // 6. Desvincular reservas (no eliminarlas, preservar el historial)
    await supabaseAdmin.from("reservas").update({ mesa_id: null }).eq("mesa_id", id);

    // 7. Eliminar la mesa
    const { error } = await supabaseAdmin.from("mesas").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return res.json({ mensaje: "Mesa eliminada correctamente" });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al eliminar la mesa",
      error: error.message,
    });
  }
};

export const obtenerMesas = async (req, res) => {
  try {
    const { personas } = req.query;
    let query = supabaseAdmin.from("mesas").select("*").order("numero");

    if (personas) {
      query = query.gte("capacidad", Number(personas));
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const mesas = (data || []).map(mapMesa);

    return res.json({
      mensaje: "Mesas obtenidas correctamente",
      total: mesas.length,
      mesas,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener las mesas",
      error: error.message,
    });
  }
};

export const obtenerMesasDisponibles = async (req, res) => {
  try {
    const { personas } = req.query;
    let query = supabaseAdmin
      .from("mesas")
      .select("*")
      .eq("disponible", true)
      .order("capacidad");

    if (personas) {
      query = query.gte("capacidad", Number(personas));
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const mesas = (data || []).map(mapMesa);

    return res.json({
      mensaje: "Mesas disponibles encontradas",
      total: mesas.length,
      mesas,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al buscar mesas disponibles",
      error: error.message,
    });
  }
};

/**
 * Resume el estado operativo de cada mesa para el dashboard.
 */
export const obtenerEstadoMesas = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("mesas")
      .select("*")
      .order("numero");

    if (error) throw new Error(error.message);

    const mesas = (data || []).map((mesa) => ({
      ...mapMesa(mesa),
      estadoActual:
        mesa.estado === "ocupada" || mesa.disponible === false
          ? "OCUPADA"
          : mesa.estado === "reservada"
            ? "RESERVADA"
            : "LIBRE",
    }));

    return res.json({
      mensaje: "Estado de mesas obtenido correctamente",
      total: mesas.length,
      mesas,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener estado de mesas",
      error: error.message,
    });
  }
};
