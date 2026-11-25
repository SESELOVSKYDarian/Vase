import { headers } from "next/headers";
import { isLabsHost, isPlatformHost } from "@/lib/security/platform-hosts";

/** Dirección principal de la app, para cuando el pedido trae un dominio que no es nuestro. */
function canonicalHost() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured.includes("://") ? configured : `https://${configured}`).host.toLowerCase();
    } catch {
      // Valor mal cargado: seguimos con el de siempre.
    }
  }
  return process.env.NODE_ENV === "production" ? "app.vase.ar" : "localhost:3002";
}

/**
 * Devuelve el dominio con el que se arman los links de los mails (verificar cuenta, cambiar
 * contraseña). El dominio del pedido lo manda el navegador y se puede falsificar: si lo usáramos
 * tal cual, alguien podría hacer que el mail de "cambiá tu contraseña" apunte a su página.
 * Por eso solo se aceptan nuestros dominios; cualquier otro se cambia por el principal.
 */
export function resolveTrustedHost(requestedHost: string | null | undefined) {
  const host = requestedHost?.split(",")[0]?.trim().toLowerCase();
  if (host && (isPlatformHost(host) || isLabsHost(host))) return host;
  return canonicalHost();
}

/** Datos del pedido actual que se guardan en el historial y se usan para armar links. */
export async function getRequestContext() {
  const requestHeaders = await headers();

  return {
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip") ??
      "unknown",
    userAgent: requestHeaders.get("user-agent"),
    host: resolveTrustedHost(requestHeaders.get("host")),
    protocol:
      requestHeaders.get("x-forwarded-proto") ??
      (process.env.NODE_ENV === "production" ? "https" : "http"),
  };
}

/** Arma un link completo (https://dominio/ruta). En producción siempre sale con https. */
export function buildAbsoluteUrl(
  path: string,
  context: { host: string; protocol: string },
) {
  const protocol = process.env.NODE_ENV === "production" ? "https" : context.protocol;
  return `${protocol}://${context.host}${path}`;
}
