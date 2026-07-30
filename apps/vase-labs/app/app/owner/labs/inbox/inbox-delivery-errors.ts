export function formatInboxDeliveryError(input: {
  code?: string;
  providerStatus?: number;
  providerMessage?: string;
}) {
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
  return "No pudimos enviar el mensaje. Revisá la conexión del canal.";
}
