import { supabaseAdmin } from "../config/supabaseAdmin.js";

function mapProducto(producto) {
  if (!producto) return null;
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio: Number(producto.precio || 0),
    disponible: producto.disponible,
  };
}

function mapItem(item) {
  return {
    id: item.id,
    pedidoId: item.pedido_id,
    productoId: item.producto_id,
    cantidad: Number(item.cantidad || 0),
    precioUnitario: Number(item.precio_unitario || 0),
    subtotal: Number(item.subtotal || 0),
    notas: item.notas || null,
    producto: mapProducto(item.productos),
  };
}

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

function mapPedido(pedido) {
  return {
    id: pedido.id,
    mesaId: pedido.mesa_id,
    estado: pedido.estado,
    comensales: pedido.comensales != null ? Number(pedido.comensales) : null,
    subtotal: Number(pedido.subtotal || 0),
    impuestos: Number(pedido.impuestos || 0),
    total: Number(pedido.total || 0),
    abiertoEn: pedido.abierto_en,
    createdAt: pedido.created_at,
    mesa: mapMesa(pedido.mesas),
    items: (pedido.pedido_items || []).map(mapItem),
    detalles: (pedido.pedido_items || []).map(mapItem),
  };
}

async function obtenerPedidoCompleto(id) {
  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .select(`
      *,
      mesas(*),
      pedido_items(
        *,
        productos(*)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(error?.message || "Pedido no encontrado");
  return data;
}

// ── Stock: descuento/restauración directa sobre productos.stock_actual ────────
// Esta DB no tiene sistema de recetas/ingredientes ni RPCs de stock, así que el
// control de stock se lleva a nivel de producto (stock_actual, numeric — campo
// autoritativo; `stock` int4 es el legado deprecado). movimientos_stock registra
// cada movimiento. Un producto con stock_actual = null se considera "sin control
// de stock": no se descuenta ni bloquea.

async function registrarMovimientoStock({ productoId, cantidad, tipo, motivo, stockAnterior, stockNuevo, pedidoId }) {
  await supabaseAdmin.from("movimientos_stock").insert({
    producto_id: productoId,
    cantidad,
    tipo,
    motivo,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    pedido_id: pedidoId || null,
  });
}

// Descuenta stock por una venta. Lanza error (STOCK_INSUFICIENTE) si no alcanza.
async function descontarStockPorVenta(producto, cantidad, pedidoId) {
  const stockActual = producto.stock_actual;
  if (stockActual === null || stockActual === undefined) return { tracked: false };

  const actual = Number(stockActual);
  if (actual < cantidad) {
    const err = new Error(`No hay stock suficiente de ${producto.nombre}`);
    err.code = "STOCK_INSUFICIENTE";
    throw err;
  }

  const nuevo = actual - cantidad;
  const { error } = await supabaseAdmin
    .from("productos")
    .update({ stock_actual: nuevo, disponible: nuevo > 0 })
    .eq("id", producto.id);
  if (error) throw new Error(error.message);

  await registrarMovimientoStock({
    productoId: producto.id,
    cantidad,
    tipo: "salida",
    motivo: `Venta - pedido ${pedidoId}`,
    stockAnterior: actual,
    stockNuevo: nuevo,
    pedidoId,
  });
  return { tracked: true };
}

// Restaura el stock de todos los ítems de un pedido (cancelación/eliminación).
async function restaurarStockDePedido(pedidoId) {
  const { data: items } = await supabaseAdmin
    .from("pedido_items")
    .select("producto_id, cantidad")
    .eq("pedido_id", pedidoId);
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (!item.producto_id) continue;
    const { data: producto } = await supabaseAdmin
      .from("productos")
      .select("id, stock_actual")
      .eq("id", item.producto_id)
      .single();
    if (!producto || producto.stock_actual === null || producto.stock_actual === undefined) continue;

    const actual = Number(producto.stock_actual);
    const nuevo = actual + Number(item.cantidad);
    await supabaseAdmin
      .from("productos")
      .update({ stock_actual: nuevo, disponible: nuevo > 0 })
      .eq("id", producto.id);
    await registrarMovimientoStock({
      productoId: producto.id,
      cantidad: Number(item.cantidad),
      tipo: "entrada",
      motivo: `Cancelación - pedido ${pedidoId}`,
      stockAnterior: actual,
      stockNuevo: nuevo,
      pedidoId,
    });
  }
}

/**
 * Abre o recupera el pedido activo de una mesa.
 */
export const abrirPedido = async (req, res) => {
  try {
    const { mesaId, comensales } = req.body;

    if (!mesaId) {
      return res.status(400).json({ mensaje: "El ID de la mesa es obligatorio" });
    }

    // Comensales opcional al abrir: si viene, debe ser entero >= 1
    const comensalesNum =
      comensales != null && Number(comensales) >= 1 ? Math.trunc(Number(comensales)) : null;

    const { data: pedidoAbierto } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .eq("mesa_id", mesaId)
      .in("estado", ["pendiente", "preparando", "listo"])
      .maybeSingle();

    if (pedidoAbierto) {
      const pedido = await obtenerPedidoCompleto(pedidoAbierto.id);
      return res.status(200).json({
        mensaje: "Pedido abierto existente recuperado",
        pedido: mapPedido(pedido),
      });
    }

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .insert({
        mesa_id: mesaId,
        estado: "pendiente",
        comensales: comensalesNum,
        subtotal: 0,
        impuestos: 0,
        total: 0,
        abierto_en: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("mesas")
      .update({ disponible: false, estado: "esperando_pedido" })
      .eq("id", mesaId);

    const pedido = await obtenerPedidoCompleto(data.id);

    return res.status(201).json({
      mensaje: "Pedido abierto correctamente",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al abrir el pedido",
      error: error.message,
    });
  }
};

export const obtenerPedidos = async (req, res) => {
  try {
    const { estado, mesaId, desde, hasta } = req.query;
    let query = supabaseAdmin
      .from("pedidos")
      .select(`
        *,
        mesas(*),
        pedido_items(
          *,
          productos(*)
        )
      `)
      .order("created_at", { ascending: false });

    if (estado) {
      const listaEstados = estado.split(",").map((s) => s.trim()).filter(Boolean);
      query = listaEstados.length === 1
        ? query.eq("estado", listaEstados[0])
        : query.in("estado", listaEstados);
    }
    if (mesaId) query = query.eq("mesa_id", mesaId);
    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const pedidos = (data || []).map(mapPedido);

    return res.json({
      mensaje: "Pedidos obtenidos correctamente",
      total: pedidos.length,
      pedidos,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener pedidos",
      error: error.message,
    });
  }
};

export const obtenerPedidoPorId = async (req, res) => {
  try {
    const pedido = await obtenerPedidoCompleto(req.params.id);

    return res.json({
      mensaje: "Pedido encontrado",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener el pedido",
      error: error.message,
    });
  }
};

/**
 * Agrega productos al pedido y descuenta stock cuando corresponde.
 */
export const agregarProductoAlPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { productoId, cantidad, notas } = req.body;
    const cantidadSolicitada = Number(cantidad || 0);

    if (!productoId || cantidadSolicitada <= 0) {
      return res.status(400).json({
        mensaje: "El producto y una cantidad mayor a 0 son obligatorios",
      });
    }

    const pedidoRaw = await obtenerPedidoCompleto(id);
    const { data: producto, error: productoError } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single();

    if (productoError || !producto) {
      console.error("Error buscando producto con ID:", productoId, "Error:", productoError);
      return res.status(404).json({ mensaje: "Producto no encontrado", error: productoError?.message, idBuscado: productoId });
    }

    const precioUnitario = Number(producto.precio || 0);
    const subtotalItem = precioUnitario * cantidadSolicitada;

    // Validar stock antes de insertar el ítem (bloquea si no alcanza; nunca negativo)
    const stockDisponible = producto.stock_actual;
    if (
      stockDisponible !== null &&
      stockDisponible !== undefined &&
      Number(stockDisponible) < cantidadSolicitada
    ) {
      return res.status(409).json({ mensaje: `No hay stock suficiente de ${producto.nombre}` });
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from("pedido_items")
      .insert({
        pedido_id: id,
        producto_id: productoId,
        cantidad: cantidadSolicitada,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem,
        notas: notas || null,
      })
      .select("*, productos(*)")
      .single();

    if (itemError) throw new Error(itemError.message);

    // Descontar stock (directo sobre stock_actual). Si falla por stock, revertir el ítem.
    try {
      await descontarStockPorVenta(producto, cantidadSolicitada, id);
    } catch (stockErr) {
      await supabaseAdmin.from("pedido_items").delete().eq("id", item.id);
      if (stockErr.code === "STOCK_INSUFICIENTE") {
        return res.status(409).json({ mensaje: stockErr.message });
      }
      throw stockErr;
    }

    const nuevoSubtotal = Number(pedidoRaw.subtotal || pedidoRaw.total || 0) + subtotalItem;
    const nuevosImpuestos = Number((nuevoSubtotal * 0.21).toFixed(2));
    const nuevoTotal = Number((nuevoSubtotal + nuevosImpuestos).toFixed(2));

    const { error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .update({
        subtotal: nuevoSubtotal,
        impuestos: nuevosImpuestos,
        total: nuevoTotal,
      })
      .eq("id", id);

    if (pedidoError) throw new Error(pedidoError.message);

    const pedidoActualizado = await obtenerPedidoCompleto(id);

    return res.status(201).json({
      mensaje: "Producto agregado al pedido correctamente",
      detalle: mapItem(item),
      pedido: mapPedido(pedidoActualizado),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al agregar producto al pedido",
      error: error.message,
    });
  }
};

/**
 * Cierra el pedido desde operaciones de salon y libera la mesa.
 */
export const cerrarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedidoRaw = await obtenerPedidoCompleto(id);

    const { error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .update({ estado: "entregado" })
      .eq("id", id);

    if (pedidoError) throw new Error(pedidoError.message);

    if (pedidoRaw.mesa_id) {
      await supabaseAdmin
        .from("mesas")
        .update({ disponible: true, estado: "libre" })
        .eq("id", pedidoRaw.mesa_id);
    }

    const pedido = await obtenerPedidoCompleto(id);

    return res.json({
      mensaje: "Pedido cerrado correctamente",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cerrar el pedido",
      error: error.message,
    });
  }
};

/**
 * Cancela un pedido y restaura stock antes de liberar la mesa.
 */
export const cancelarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedidoRaw = await obtenerPedidoCompleto(id);

    // Restaurar stock de todos los ítems (si no estaba ya cancelado → evita doble restauración)
    if (pedidoRaw.estado !== "cancelado") {
      await restaurarStockDePedido(id);
    }

    const { error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado: "cancelado" })
      .eq("id", id);

    if (error) throw new Error(error.message);

    if (pedidoRaw.mesa_id) {
      await supabaseAdmin
        .from("mesas")
        .update({ disponible: true, estado: "libre" })
        .eq("id", pedidoRaw.mesa_id);
    }

    const pedido = await obtenerPedidoCompleto(id);

    return res.json({
      mensaje: "Pedido cancelado correctamente",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cancelar el pedido",
      error: error.message,
    });
  }
};
const PEDIDO_A_MESA_ESTADO = {
  pendiente: "esperando_pedido",
  preparando: "esperando_pedido",
  listo: "pedido_listo",
  entregado: "ocupada", // esperando_pago no existe en el enum → se queda como ocupada
  cancelado: "libre",
};

/**
 * Sincroniza el estado de cocina del pedido con la mesa.
 */
export const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const ESTADOS_VALIDOS = ["pendiente", "preparando", "listo", "entregado", "cancelado"];
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        mensaje: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }

    // Obtener mesa_id + estado actual antes de actualizar
    const { data: pedidoRaw } = await supabaseAdmin
      .from("pedidos")
      .select("mesa_id, estado")
      .eq("id", id)
      .single();

    // Al cancelar, restaurar stock de los ítems (si no estaba ya cancelado)
    if (estado === "cancelado" && pedidoRaw?.estado !== "cancelado") {
      await restaurarStockDePedido(id);
    }

    const { error } = await supabaseAdmin
      .from("pedidos")
      .update({ estado })
      .eq("id", id);

    if (error) throw new Error(error.message);

    // Sincronizar estado de la mesa según el nuevo estado del pedido
    const mesaId = pedidoRaw?.mesa_id;
    const nuevoEstadoMesa = PEDIDO_A_MESA_ESTADO[estado];
    if (mesaId && nuevoEstadoMesa) {
      const disponible = estado === "cancelado";
      await supabaseAdmin
        .from("mesas")
        .update({ estado: nuevoEstadoMesa, disponible })
        .eq("id", mesaId);
    }

    const pedido = await obtenerPedidoCompleto(id);

    return res.json({
      mensaje: "Estado actualizado correctamente",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al actualizar estado del pedido",
      error: error.message,
    });
  }
};

export const actualizarComensales = async (req, res) => {
  try {
    const { id } = req.params;
    const { comensales } = req.body;

    const comensalesNum = Math.trunc(Number(comensales));
    if (!Number.isFinite(comensalesNum) || comensalesNum < 1) {
      return res.status(400).json({
        mensaje: "El número de comensales debe ser un entero mayor o igual a 1",
      });
    }

    const { error } = await supabaseAdmin
      .from("pedidos")
      .update({ comensales: comensalesNum })
      .eq("id", id);

    if (error) throw new Error(error.message);

    const pedido = await obtenerPedidoCompleto(id);

    return res.json({
      mensaje: "Comensales actualizados correctamente",
      pedido: mapPedido(pedido),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al actualizar comensales",
      error: error.message,
    });
  }
};

export const eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener mesa_id + estado antes de eliminar (para liberar la mesa y decidir restauración)
    const { data: pedidoRaw } = await supabaseAdmin
      .from("pedidos")
      .select("mesa_id, estado")
      .eq("id", id)
      .single();
    const mesaId = pedidoRaw?.mesa_id;

    // Restaurar stock de los ítems antes de borrarlos (si no estaba ya cancelado)
    if (pedidoRaw && pedidoRaw.estado !== "cancelado") {
      await restaurarStockDePedido(id);
    }

    // Orden correcto respetando FKs:
    // 1. facturas (referencia pedidos y pagos)
    const { error: facturasError } = await supabaseAdmin
      .from("facturas")
      .delete()
      .eq("pedido_id", id);
    if (facturasError) throw new Error(facturasError.message);

    // 2. movimientos_stock (referencia pedidos)
    const { error: stockError } = await supabaseAdmin
      .from("movimientos_stock")
      .delete()
      .eq("pedido_id", id);
    if (stockError) throw new Error(stockError.message);

    // 3. pedido_items (referencia pedidos)
    const { error: itemsError } = await supabaseAdmin
      .from("pedido_items")
      .delete()
      .eq("pedido_id", id);
    if (itemsError) throw new Error(itemsError.message);

    // 4. pedido
    const { error } = await supabaseAdmin
      .from("pedidos")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);

    // 5. Liberar la mesa automáticamente
    if (mesaId) {
      await supabaseAdmin
        .from("mesas")
        .update({ disponible: true, estado: "libre" })
        .eq("id", mesaId);
    }

    return res.json({ mensaje: "Pedido eliminado correctamente" });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al eliminar el pedido",
      error: error.message,
    });
  }
};
