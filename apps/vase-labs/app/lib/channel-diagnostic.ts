export type DiagnosticCheck = { ok: boolean; code?: string; message: string };

export type ChannelDiagnosticResult = {
  ok: boolean;
  status: string;
  testedAt: string;
  summary: string;
  checks: {
    credentials: DiagnosticCheck;
    metaApi: DiagnosticCheck;
    asset: DiagnosticCheck;
    webhook: DiagnosticCheck;
    subscription: DiagnosticCheck;
  };
};

const messages: Record<string, string> = {
  CHANNEL_NOT_CONNECTED: "El canal todavía no está completamente conectado.",
  CHANNEL_CREDENTIAL_MISSING: "Faltan credenciales necesarias para probar este canal.",
  CHANNEL_TEST_FAILED: "No pudimos ejecutar la prueba del canal.",
  CHANNEL_VERIFY_FAILED: "No pudimos verificar la configuración del canal.",
  CHANNEL_CONNECTION_FAILED: "No pudimos validar la conexión del canal.",
  META_TOKEN_INVALID: "El Access Token es inválido, venció o pertenece a otra aplicación de Meta.",
  META_PERMISSIONS_MISSING: "El Access Token no tiene todos los permisos requeridos.",
  META_ASSET_NOT_AUTHORIZED: "La cuenta configurada no pertenece al activo autorizado por este token.",
  META_ASSET_PARENT_MISSING: "Falta configurar el activo principal requerido por Meta.",
  ASSET_VALIDATION_PENDING: "El activo Meta ya fue guardado y aún espera la validación final.",
  ASSET_MISSING: "Falta seleccionar el activo Meta que recibirá los mensajes.",
  META_SUBSCRIPTION_FAILED: "Meta validó la cuenta, pero no pudo activar la suscripción de mensajes.",
  META_GRAPH_REQUEST_FAILED: "No pudimos comunicarnos correctamente con la API de Meta.",
  META_APP_ID_MISSING: "Falta el Meta App ID de esta conexión.",
  META_APP_SECRET_MISSING: "Falta el Meta App Secret de esta conexión.",
  META_LONG_LIVED_TOKEN_EXCHANGE_FAILED: "No pudimos convertir el token en una credencial de larga duración.",
  TOKEN_ENCRYPTION_SECRET_MISSING: "Vase Labs no puede descifrar las credenciales porque falta la configuración interna de seguridad.",
  CHANNEL_CREDENTIAL_REENTER_REQUIRED: "Volvé a ingresar las credenciales del canal.",
  META_OAUTH_REDIRECT_URI_MISSING: "La configuración OAuth de Meta está incompleta.",
  META_WEBHOOK_SECRET_MISSING: "Falta la configuración del webhook de Meta.",
  LABS_SESSION_REQUIRED: "Tu sesión de Vase Labs expiró. Volvé a iniciar sesión.",
  LABS_SESSION_INVALID: "Tu sesión de Vase Labs no es válida.",
  LABS_SESSION_EXPIRED: "Tu sesión de Vase Labs expiró. Volvé a iniciar sesión.",
  LABS_TENANT_FORBIDDEN: "No tenés acceso a este espacio de trabajo.",
  WEBHOOK_NOT_VERIFIED: "Meta todavía no verificó este webhook.",
  SUBSCRIPTION_NOT_ACTIVE: "Meta todavía no tiene activa la suscripción de eventos.",
  CREDENTIALS_MISSING: "Las credenciales necesarias todavía no están configuradas.",
};

export function channelErrorMessage(code?: string) {
  return messages[code ?? ""] ?? "No pudimos completar esta operación. Revisá la configuración e intentá nuevamente.";
}

export function diagnosticCheck(ok: boolean, success: string, code?: string): DiagnosticCheck {
  return ok ? { ok: true, message: success } : { ok: false, code, message: channelErrorMessage(code) };
}
