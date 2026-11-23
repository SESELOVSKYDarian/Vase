// Diseño único de los correos de Vase: logo, título, texto, botón, recuadro de datos, firma y pie.
// HTML con tablas y estilos en línea (lo que leen bien Gmail, Outlook y Apple Mail), modo claro siempre.

export type EmailContent = {
  /** Texto corto que se ve al lado del asunto en la bandeja de entrada. */
  preheader?: string;
  title: string;
  /** Saludo, por ejemplo "Hola, Darian". */
  greeting?: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  /** Datos en un recuadro (fecha, dispositivo, monto...). */
  details?: Array<[string, string]>;
  /** Aviso chico debajo del botón (por ejemplo, cuánto dura el enlace). */
  note?: string;
  /** Por qué le llegó este correo; va en el pie. */
  reason?: string;
};

const BRAND = {
  name: "Vase",
  site: "https://vase.ar",
  help: "https://help.vase.ar",
  support: "soporte@vase.ar",
  logo: "https://app.vase.ar/vasecolorlogo.png",
  green: "#3B633D",
  ink: "#111418",
  muted: "#5b6660",
  line: "#e6ebe7",
  soft: "#f4f6f4",
};

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Solo enlaces http(s): nada de javascript: ni data: en un botón. */
function safeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

export function renderEmail(content: EmailContent) {
  const year = new Date().getFullYear();
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${BRAND.muted};">${escapeHtml(text)}</p>`;

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:${BRAND.soft};border-radius:12px;">
        ${content.details
          .map(
            ([label, value], index) => `<tr>
          <td style="padding:${index === 0 ? "14px" : "8px"} 18px ${index === content.details!.length - 1 ? "14px" : "8px"};font-size:13px;line-height:20px;color:${BRAND.muted};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:${index === 0 ? "14px" : "8px"} 18px ${index === content.details!.length - 1 ? "14px" : "8px"};font-size:13px;line-height:20px;color:${BRAND.ink};font-weight:600;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td style="border-radius:10px;background:${BRAND.green};">
          <a href="${safeUrl(content.button.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(content.button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:12px;line-height:18px;color:${BRAND.muted};">Si el botón no funciona, copiá este enlace en tu navegador:<br><a href="${safeUrl(content.button.url)}" style="color:${BRAND.green};word-break:break-all;">${escapeHtml(content.button.url)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.soft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader ?? content.paragraphs[0] ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 20px;">
        <a href="${BRAND.site}" style="text-decoration:none;color:${BRAND.ink};font-size:20px;font-weight:800;letter-spacing:-0.5px;">
          <img src="${BRAND.logo}" width="28" height="28" alt="" style="vertical-align:middle;border:0;margin-right:8px;">${BRAND.name.toLowerCase()}
        </a>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${BRAND.line};border-radius:16px;padding:36px 32px;">
        <h1 style="margin:0 0 20px;font-size:24px;line-height:32px;font-weight:800;color:${BRAND.ink};letter-spacing:-0.3px;">${escapeHtml(content.title)}</h1>
        ${content.greeting ? p(content.greeting) : ""}
        ${content.paragraphs.map(p).join("")}
        ${details}
        ${button}
        ${content.note ? `<p style="margin:0 0 20px;font-size:13px;line-height:20px;color:${BRAND.muted};">${escapeHtml(content.note)}</p>` : ""}
        <p style="margin:8px 0 0;padding-top:20px;border-top:1px solid ${BRAND.line};font-size:14px;line-height:22px;color:${BRAND.ink};">
          Saludos,<br><strong>El equipo de Vase</strong><br>
          <span style="font-size:13px;color:${BRAND.muted};">¿Necesitás ayuda? Escribinos a <a href="mailto:${BRAND.support}" style="color:${BRAND.green};">${BRAND.support}</a></span>
        </p>
      </td></tr>
      <tr><td style="padding:24px 8px 0;text-align:center;font-size:12px;line-height:18px;color:#8a958e;">
        ${content.reason ? `${escapeHtml(content.reason)}<br>` : ""}
        Este correo se envía desde una dirección que no recibe respuestas.<br>
        <a href="${BRAND.site}" style="color:#8a958e;">vase.ar</a> &nbsp;·&nbsp; <a href="${BRAND.help}" style="color:#8a958e;">Ayuda</a> &nbsp;·&nbsp; <a href="${BRAND.site}/politica-de-privacidad" style="color:#8a958e;">Privacidad</a><br>
        © ${year} Vase. Mar del Plata, Argentina.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    content.title,
    "",
    ...(content.greeting ? [content.greeting, ""] : []),
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(content.details?.length ? [...content.details.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(content.button ? [`${content.button.label}: ${content.button.url}`, ""] : []),
    ...(content.note ? [content.note, ""] : []),
    "Saludos,",
    "El equipo de Vase",
    `¿Necesitás ayuda? ${BRAND.support}`,
    "",
    content.reason ?? "",
    "Este correo se envía desde una dirección que no recibe respuestas. vase.ar",
  ]
    .join("\n")
    .trim();

  return { html, text };
}
