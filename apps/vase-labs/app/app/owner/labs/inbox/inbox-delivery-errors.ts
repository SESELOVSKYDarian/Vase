export function formatInboxDeliveryError(input: {
  code?: string;
  providerStatus?: number;
  providerMessage?: string;
}) {
  if (input.code === "INBOX_REPLY_INVALID_RESPONSE") {
    const status = input.providerStatus ? ` HTTP ${input.providerStatus}.` : "";
    return `Vase Labs recibió una respuesta inválida del servidor al intentar enviar el mensaje.${status}`;
  }
  if (input.code === "CONVERSATION_NOT_DELIVERABLE") {
    return "Esta conversación no tiene un destinatario válido para el canal.";
  }
  if (input.code === "OFFICIAL_CHANNEL_NOT_CONNECTED") {
    return "El canal oficial no está conectado. Volvé a conectarlo desde Canales.";
  }
  if (
    input.code === "TOKEN_ENCRYPTION_SECRET_MISSING"
    || input.code === "CHANNEL_CREDENTIAL_DECRYPTION_FAILED"
  ) {
    return "No pudimos abrir las credenciales. Volvé a conectar el canal para guardarlas con la clave actual.";
  }
  if (input.code === "META_SEND_UNCONFIRMED") {
    return "Meta no devolvió un identificador para el mensaje. El envío no se marcó como exitoso.";
  }
  if (input.code?.startsWith("META_SEND_FAILED:")) {
    return `Meta rechazó el envío: ${input.code.slice("META_SEND_FAILED:".length).trim()}`;
  }
  if (input.code === "META_SEND_FAILED") {
    const status = input.providerStatus ? ` (HTTP ${input.providerStatus})` : "";
    const detail = input.providerMessage ? `: ${input.providerMessage}` : ".";
    return `Meta rechazó el envío${status}${detail}`;
  }
  if (input.code === "META_GRAPH_REQUEST_FAILED") {
    const detail = input.providerMessage ? `: ${input.providerMessage}` : ".";
    return `No pudimos comunicarnos con la API de Meta${detail}`;
  }
  if (input.code === "META_PERMISSIONS_MISSING") {
    return "El token de Meta no tiene los permisos necesarios para enviar mensajes.";
  }
  if (input.code === "META_TOKEN_INVALID") {
    return "El token de Meta es inválido, venció o pertenece a otra aplicación.";
  }
  if (input.code === "CHANNEL_DELIVERY_FAILED") {
    return "No hubo confirmación de entrega del canal. Ejecutá Probar canal y revisá el estado Meta.";
  }
  if (input.code === "APP_INTERNAL_URL_UNREACHABLE" || input.code === "LABS_CONTEXT_FAILED") {
    return "Labs no pudo comunicarse con Vase App. Revisá APP_INTERNAL_URL y SERVICE_TO_SERVICE_TOKEN.";
  }
  if (input.code === "SERVICE_TOKEN_NOT_CONFIGURED") {
    return "Falta SERVICE_TO_SERVICE_TOKEN en Vase Labs.";
  }
  if (input.code === "LABS_SESSION_REQUIRED" || input.code === "LABS_SESSION_INVALID" || input.code === "LABS_SESSION_EXPIRED") {
    return "La sesión de Labs expiró. Volvé a iniciar sesión.";
  }
  const safeCode = input.code && /^[A-Z0-9_:-]{1,160}$/.test(input.code)
    ? ` Código: ${input.code}`
    : "";
  return `No pudimos enviar el mensaje. Revisá la conexión del canal.${safeCode}`;
}

export type ParsedInboxReplyResponse =
  | { ok: true; payload: Record<string, any> }
  | { ok: false; error: { code: "INBOX_REPLY_INVALID_RESPONSE"; httpStatus: number } };

export async function parseInboxReplyResponse(response: Response): Promise<ParsedInboxReplyResponse> {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, error: { code: "INBOX_REPLY_INVALID_RESPONSE", httpStatus: response.status } };
  }
  try {
    const payload: unknown = raw ? JSON.parse(raw) : {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_JSON_RESPONSE");
    return { ok: true, payload: payload as Record<string, any> };
  } catch {
    return { ok: false, error: { code: "INBOX_REPLY_INVALID_RESPONSE", httpStatus: response.status } };
  }
}
