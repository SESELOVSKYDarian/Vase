const ROLES_FACTURACION = new Set(["admin", "cajero"]);
const ROLES_PAGO_INTERNO_NO_FISCAL = new Set(["admin"]);

/**
 * Extrae rol y usuario desde headers internos del dashboard.
 */
export function obtenerUsuarioRequest(req) {
  return {
    rol: String(req.headers["x-noctua-role"] || req.headers["x-user-role"] || "")
      .trim()
      .toLowerCase(),
    nombre: String(req.headers["x-noctua-user"] || req.headers["x-user-name"] || "")
      .trim(),
    id: String(req.headers["x-noctua-user-id"] || req.headers["x-user-id"] || "")
      .trim(),
  };
}

export function tienePermisoFacturacion(req) {
  const usuario = obtenerUsuarioRequest(req);
  return ROLES_FACTURACION.has(usuario.rol);
}

export function rechazarSinPermisoFacturacion(req, res) {
  if (tienePermisoFacturacion(req)) return false;

  res.status(403).json({
    mensaje: "No tenes permisos para acceder al modulo de facturacion",
  });
  return true;
}

export function tienePermisoPagoInternoNoFiscal(req) {
  const usuario = obtenerUsuarioRequest(req);
  return ROLES_PAGO_INTERNO_NO_FISCAL.has(usuario.rol);
}

/**
 * Limita el Movimiento interno no fiscal a administradores.
 */
export function rechazarSinPermisoPagoInternoNoFiscal(req, res) {
  if (tienePermisoPagoInternoNoFiscal(req)) return false;

  res.status(403).json({
    mensaje: "No tenes permisos para registrar pagos internos no fiscales",
  });
  return true;
}
