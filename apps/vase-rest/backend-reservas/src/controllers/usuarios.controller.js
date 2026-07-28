import { supabaseAdmin } from "../config/supabaseAdmin.js";

function asString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "activo" : "inactivo";

  return fallback;
}

function normalizarEstado(usuario) {
  if (usuario.estado !== undefined && usuario.estado !== null) {
    return asString(usuario.estado);
  }

  if (usuario.status !== undefined && usuario.status !== null) {
    return asString(usuario.status);
  }

  if (usuario.activo !== undefined && usuario.activo !== null) {
    return usuario.activo ? "activo" : "inactivo";
  }

  if (usuario.disponible !== undefined && usuario.disponible !== null) {
    return usuario.disponible ? "activo" : "inactivo";
  }

  return null;
}

function normalizarUsuario(usuario) {
  const nombre =
    usuario.nombre ||
    usuario.full_name ||
    usuario.name ||
    usuario.username ||
    usuario.email ||
    "Sin nombre";

  return {
    id: asString(usuario.id || usuario.user_id || usuario.auth_id),
    nombre: asString(nombre, "Sin nombre"),
    email: asString(usuario.email || usuario.correo || usuario.mail),
    rol: asString(usuario.rol || usuario.role || usuario.tipo, "sin rol"),
    estado: normalizarEstado(usuario),
    creadoEn:
      usuario.creado_en ||
      usuario.created_at ||
      usuario.createdAt ||
      usuario.fecha_creacion ||
      null,
  };
}

async function obtenerDesdeTabla(tabla) {
  const { data, error } = await supabaseAdmin.from(tabla).select("*");

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

export const obtenerUsuarios = async (req, res) => {
  try {
    let tablaUsada = "usuarios";
    let usuariosRaw = [];

    try {
      usuariosRaw = await obtenerDesdeTabla("usuarios");
    } catch (usuariosError) {
      tablaUsada = "profiles";

      try {
        usuariosRaw = await obtenerDesdeTabla("profiles");
      } catch (profilesError) {
        return res.status(500).json({
          mensaje: "Error al obtener usuarios desde Supabase",
          error: profilesError.message,
          detalleUsuarios: usuariosError.message,
        });
      }
    }

    const usuarios = usuariosRaw
      .map(normalizarUsuario)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return res.json({
      mensaje: "Usuarios obtenidos correctamente",
      total: usuarios.length,
      tabla: tablaUsada,
      usuarios,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener usuarios",
      error: error.message,
    });
  }
};
