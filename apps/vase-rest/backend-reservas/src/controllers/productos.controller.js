import { supabaseAdmin } from "../config/supabaseAdmin.js";

function mapProducto(producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: Number(producto.precio || 0),
    categoria: producto.categorias || producto.categoria || { id: producto.categoria_id, nombre: "Sin categoria" },
    categoria_id: producto.categoria_id,
    imagen_url: producto.imagen_url,
    disponible: producto.disponible,
    activo: producto.activo !== undefined ? producto.activo : true,
    stock: Number(producto.stock_actual ?? producto.stock ?? 0),
    createdAt: producto.created_at || producto.creado_en,
  };
}

function isMissingActivoColumn(error) {
  return error?.code === "42703" || String(error?.message || "").includes("productos.activo");
}

// Compatibilidad con esquemas que todavia no tienen la columna activo.
async function insertProducto(payload, retryWithoutActivo = true) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert(payload)
    .select()
    .single();

  if (error && retryWithoutActivo && isMissingActivoColumn(error)) {
    const { activo, ...fallbackPayload } = payload;
    return insertProducto(fallbackPayload, false);
  }

  return { data, error };
}

async function updateProducto(id, cambios, retryWithoutActivo = true) {
  const { data, error } = await supabaseAdmin
    .from("productos")
    .update(changesWithoutUndefined(cambios))
    .eq("id", id)
    .select()
    .single();

  if (error && retryWithoutActivo && isMissingActivoColumn(error)) {
    const { activo, ...fallbackChanges } = cambios;
    return updateProducto(id, fallbackChanges, false);
  }

  return { data, error };
}

function changesWithoutUndefined(changes) {
  return Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
}

function buildProductosQuery({ categoria, disponible, filtrarActivos }) {
  let query = supabaseAdmin
    .from("productos")
    .select("*, categorias(id, nombre)")
    .order("creado_en", { ascending: false });

  if (categoria) query = query.eq("categoria_id", categoria);
  if (disponible === "true") query = query.eq("disponible", true);
  if (disponible === "false") query = query.eq("disponible", false);
  if (filtrarActivos) query = query.or("activo.is.null,activo.eq.true");

  return query;
}

/**
 * Crea productos del catalogo con stock inicial.
 */
export const crearProducto = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      categoria,
      categoriaId,
      categoria_id,
      stock,
      disponible,
    } = req.body;

    if (!nombre || precio === undefined || precio === null) {
      return res.status(400).json({
        mensaje: "El nombre y el precio son obligatorios",
      });
    }

    const stockValue = stock !== undefined ? Number(stock) : 0;

    const { data, error } = await insertProducto({
      nombre,
      descripcion: descripcion || null,
      precio: Number(precio),
      categoria_id: categoria_id || categoriaId || categoria || null,
      disponible: disponible !== undefined ? disponible : true,
      activo: true,
      stock: stockValue,
      stock_actual: stockValue,
    });

    if (error) throw new Error(error.message);

    return res.status(201).json({
      mensaje: "Producto creado correctamente",
      producto: mapProducto(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al crear el producto",
      error: error.message,
    });
  }
};

export const obtenerProductos = async (req, res) => {
  try {
    const { categoria, disponible, incluirInactivos } = req.query;
    const shouldFilterActivos = incluirInactivos !== "true";

    let { data, error } = await buildProductosQuery({
      categoria,
      disponible,
      filtrarActivos: shouldFilterActivos,
    });

    if (error && shouldFilterActivos && isMissingActivoColumn(error)) {
      const fallback = await buildProductosQuery({
        categoria,
        disponible,
        filtrarActivos: false,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);

    const productos = (data || []).map(mapProducto);

    return res.json({
      mensaje: "Productos obtenidos correctamente",
      total: productos.length,
      productos,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener los productos",
      error: error.message,
    });
  }
};

export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    return res.json({
      mensaje: "Producto encontrado",
      producto: mapProducto(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener el producto",
      error: error.message,
    });
  }
};

export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, categoriaId, categoria_id, disponible, activo } =
      req.body;

    const cambios = {};
    if (nombre !== undefined) cambios.nombre = nombre;
    if (descripcion !== undefined) cambios.descripcion = descripcion;
    if (precio !== undefined) cambios.precio = Number(precio);
    if (categoria_id !== undefined || categoriaId !== undefined || categoria !== undefined) {
      cambios.categoria_id = categoria_id || categoriaId || categoria;
    }
    if (disponible !== undefined) cambios.disponible = disponible;
    if (activo !== undefined) cambios.activo = activo;
    if (req.body.stock !== undefined) {
      cambios.stock = Number(req.body.stock);
      cambios.stock_actual = Number(req.body.stock);
    }

    const { data, error } = await updateProducto(id, cambios);

    if (error) throw new Error(error.message);

    return res.json({
      mensaje: "Producto actualizado correctamente",
      producto: mapProducto(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al actualizar el producto",
      error: error.message,
    });
  }
};

/**
 * Desactiva productos para conservar historiales de ventas.
 */
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await updateProducto(id, { activo: false, disponible: false });

    if (error) throw new Error(error.message);

    return res.json({
      mensaje: "Producto desactivado correctamente",
      producto: data ? mapProducto(data) : null,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al desactivar el producto",
      error: error.message,
    });
  }
};

export const cambiarDisponibilidadProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: producto, error: getError } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !producto) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    const { data, error } = await updateProducto(id, { disponible: !producto.disponible });

    if (error) throw new Error(error.message);

    return res.json({
      mensaje: "Disponibilidad del producto actualizada",
      producto: mapProducto(data),
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al cambiar la disponibilidad",
      error: error.message,
    });
  }
};
