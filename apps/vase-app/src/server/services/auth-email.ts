import nodemailer, { type Transporter } from "nodemailer";
import { renderEmail, type EmailContent } from "@/server/services/email-layout";

/** Correo con un enlace seguro (confirmar el correo, recuperar la contraseña, invitación). */
type AuthEmailPayload = {
  email: string;
  subject: string;
  actionUrl: string;
  title?: string;
  greeting?: string;
  paragraphs?: string[];
  buttonLabel?: string;
  note?: string;
  reason?: string;
};

/** Aviso sin enlace obligatorio. `message` puede venir en varias líneas: cada una es un párrafo. */
type NoticeEmailPayload = {
  email: string;
  subject: string;
  message: string;
  title?: string;
  greeting?: string;
  details?: Array<[string, string]>;
  button?: { label: string; url: string };
  note?: string;
  reason?: string;
};

let cachedTransporter: Transporter | null = null;

/**
 * Los correos salen de "Vase" <no-reply@vase.ar> (un alias de soporte@vase.ar en Google Workspace) y las
 * respuestas van a soporte. SMTP_USER es la cuenta que se autentica (soporte@vase.ar, con contraseña de aplicación).
 */
function getSmtpConfig() {
  const address = (process.env.AUTH_FROM_EMAIL ?? "no-reply@vase.ar").trim();
  const name = (process.env.AUTH_FROM_NAME ?? "Vase").trim();
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    // Si AUTH_FROM_EMAIL ya trae el nombre ("Vase <no-reply@vase.ar>"), se respeta.
    from: address.includes("<") ? address : `"${name.replace(/"/g, "")}" <${address}>`,
    replyTo: (process.env.EMAIL_REPLY_TO ?? "soporte@vase.ar").trim(),
  };
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const config = getSmtpConfig();
  if (!config.host || !config.user || !config.pass) return null;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return cachedTransporter;
}

async function deliver(to: string, subject: string, content: EmailContent, logTag: string) {
  const transporter = getTransporter();
  const config = getSmtpConfig();
  if (!transporter) {
    console.info(`[${logTag}:fallback] to=${to} subject="${subject}"`);
    return;
  }
  const { html, text } = renderEmail(content);
  await transporter.sendMail({ from: config.from, replyTo: config.replyTo, to, subject, text, html });
  console.info(`[${logTag}:sent] to=${to} subject="${subject}" via=${config.host}:${config.port}`);
}

export async function sendAuthEmail(payload: AuthEmailPayload) {
  await deliver(
    payload.email,
    payload.subject,
    {
      preheader: payload.paragraphs?.[0] ?? payload.subject,
      title: payload.title ?? payload.subject,
      greeting: payload.greeting,
      paragraphs: payload.paragraphs ?? ["Para seguir, tocá el botón de abajo."],
      button: { label: payload.buttonLabel ?? "Abrir enlace seguro", url: payload.actionUrl },
      note: payload.note,
      reason: payload.reason,
    },
    "auth-email",
  );
}

export async function sendNoticeEmail(payload: NoticeEmailPayload) {
  await deliver(
    payload.email,
    payload.subject,
    {
      title: payload.title ?? payload.subject,
      greeting: payload.greeting,
      paragraphs: payload.message
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
      details: payload.details,
      button: payload.button,
      note: payload.note,
      reason: payload.reason,
    },
    "notice-email",
  );
}
