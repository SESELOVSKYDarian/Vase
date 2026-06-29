import { appConfig } from "@/config/app";
import { logEvent } from "@/lib/observability/logger";
import type { ContactInquiryInput } from "@/lib/validators/contact";

const RESEND_API_URL = "https://api.resend.com/emails";

function getContactMailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY ?? "",
    toEmail: process.env.CONTACT_TO_EMAIL ?? appConfig.supportEmail,
    fromEmail: process.env.CONTACT_FROM_EMAIL ?? "Vase Contact <contacto@vase.ar>",
  };
}

export async function sendContactEmail(payload: ContactInquiryInput) {
  const config = getContactMailConfig();

  if (!config.apiKey || !config.toEmail) {
    throw new Error("CONTACT_EMAIL_NOT_CONFIGURED");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: [config.toEmail],
      reply_to: payload.email,
      subject: `Nueva consulta desde Vase · ${payload.fullName}`,
      text: [
        "Nueva consulta enviada desde el footer publico de Vase.",
        "",
        `Nombre: ${payload.fullName}`,
        `Email: ${payload.email}`,
        "",
        "Mensaje:",
        payload.message,
      ].join("\n"),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const responseText = await response.text();

    logEvent({
      event: "contact.email_failed",
      message: "Contact email delivery failed.",
      metadata: {
        status: response.status,
        responseText,
      },
    });

    throw new Error("CONTACT_EMAIL_SEND_FAILED");
  }
}
