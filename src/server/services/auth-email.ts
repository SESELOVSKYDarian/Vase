import nodemailer from "nodemailer";

type AuthEmailPayload = {
  email: string;
  subject: string;
  actionUrl: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    fromEmail: process.env.AUTH_FROM_EMAIL ?? process.env.SMTP_USER ?? "no-reply@vase.ar",
  };
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getSmtpConfig();

  if (!config.host || !config.user || !config.pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
}

function buildEmailHtml(payload: AuthEmailPayload) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8faf8;color:#191c1b;padding:32px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid rgba(108,123,112,0.14);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#006d43;font-weight:700;">Vase</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">${payload.subject}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5a51;">
          Para continuar, haz clic en el siguiente botón:
        </p>
        <a
          href="${payload.actionUrl}"
          style="display:inline-block;padding:14px 22px;border-radius:999px;background:#18c37e;color:#004a2c;text-decoration:none;font-weight:700;"
        >
          Abrir enlace seguro
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#6c7b70;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin:8px 0 0;font-size:13px;line-height:1.7;word-break:break-all;color:#006d43;">
          ${payload.actionUrl}
        </p>
      </div>
    </div>
  `;
}

export async function sendAuthEmail(payload: AuthEmailPayload) {
  const transporter = getTransporter();
  const config = getSmtpConfig();

  if (!transporter) {
    console.info(
      `[auth-email:fallback] to=${payload.email} subject="${payload.subject}" url=${payload.actionUrl}`,
    );
    return;
  }

  await transporter.sendMail({
    from: config.fromEmail,
    to: payload.email,
    subject: payload.subject,
    text: `${payload.subject}\n\nAbre este enlace seguro:\n${payload.actionUrl}`,
    html: buildEmailHtml(payload),
  });

  console.info(
    `[auth-email:sent] to=${payload.email} subject="${payload.subject}" via=${config.host}:${config.port}`,
  );
}
