// Comprobante de pago de Vase en PDF (no es una factura). Escrito a mano —texto, líneas y rectángulos— para no
// sumar dependencias, igual que el presupuesto de Vase Labs. Fuentes estándar Helvetica con WinAnsi.
import { createHmac } from "node:crypto";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

function toWinAnsi(text: string) {
  let out = "";
  for (const char of text.normalize("NFC")) {
    const code = char.codePointAt(0) ?? 63;
    if (char === "–" || char === "—") out += "-";
    else if (char === "·") out += String.fromCharCode(0xb7);
    else if (code === 9 || code === 10 || code === 13) out += " ";
    else if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += char;
    else out += "?";
  }
  return out;
}

const escapePdf = (text: string) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function textWidth(text: string, size: number, bold = false) {
  const table = bold ? HELV_B : HELV;
  let width = 0;
  for (const char of toWinAnsi(text)) {
    const code = char.charCodeAt(0);
    width += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (width * size) / 1000;
}

function fitText(text: string, size: number, maxWidth: number, bold = false) {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(`${cut}...`, size, bold) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

type Rgb = [number, number, number];
const INK: Rgb = [0.067, 0.078, 0.094];
const MUTED: Rgb = [0.4, 0.44, 0.52];
const LINE: Rgb = [0.9, 0.91, 0.93];
const SOFT: Rgb = [0.957, 0.961, 0.969];
const ACCENT: Rgb = [0, 0.427, 0.263];

class Page {
  ops: string[] = [];
  text(x: number, y: number, value: string, size: number, options: { bold?: boolean; color?: Rgb; align?: "left" | "right" } = {}) {
    const width = options.align === "right" ? textWidth(value, size, options.bold) : 0;
    const [r, g, b] = options.color ?? INK;
    this.ops.push(`BT /${options.bold ? "F2" : "F1"} ${size} Tf ${r} ${g} ${b} rg ${(x - width).toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(toWinAnsi(value))}) Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.ops.push(`${color[0]} ${color[1]} ${color[2]} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = LINE, width = 0.8) {
    this.ops.push(`${color[0]} ${color[1]} ${color[2]} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }
}

export type ReceiptPdfInput = {
  paymentId: string;
  concept: string;
  total: number;
  paid: number;
  issuedAt: Date;
  customer: { name: string; legalName?: string | null; taxId?: string | null; email?: string | null };
  items: Array<{ paidAt: Date; method: string | null; reference: string | null; amount: number }>;
};

const money = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(value);
const date = (value: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(value);

/** Número legible del comprobante, sale del id de la factura. */
export function receiptNumber(paymentId: string) {
  return `VC-${paymentId.slice(-8).toUpperCase()}`;
}

/**
 * Código para validar que el comprobante lo emitió Vase: se recalcula con la clave del servidor y el id de la
 * factura. Si alguien cambia el PDF, el código no coincide.
 */
export function receiptVerificationCode(paymentId: string, paid: number, secret = process.env.AUTH_SECRET ?? "") {
  const digest = createHmac("sha256", secret || "vase-receipt").update(`${paymentId}:${paid.toFixed(2)}`).digest("hex").slice(0, 12).toUpperCase();
  return digest.match(/.{1,4}/g)!.join("-");
}

export function renderReceiptPdf(input: ReceiptPdfInput): Buffer {
  const page = new Page();
  const contentW = PAGE_W - MARGIN * 2;
  const number = receiptNumber(input.paymentId);

  // Encabezado
  page.rect(0, PAGE_H - 6, PAGE_W, 6, ACCENT);
  page.text(MARGIN, PAGE_H - 64, "vase", 26, { bold: true });
  page.text(MARGIN, PAGE_H - 82, "vase.ar · facturacion@vase.ar", 9.5, { color: MUTED });
  page.text(PAGE_W - MARGIN, PAGE_H - 56, "COMPROBANTE DE PAGO", 10, { bold: true, color: ACCENT, align: "right" });
  page.text(PAGE_W - MARGIN, PAGE_H - 76, `N.º ${number}`, 18, { bold: true, align: "right" });
  page.text(PAGE_W - MARGIN, PAGE_H - 92, `Emitido el ${date(input.issuedAt)}`, 9.5, { color: MUTED, align: "right" });

  // Cliente
  let y = PAGE_H - 140;
  page.rect(MARGIN, y - 54, contentW, 74, SOFT);
  page.text(MARGIN + 14, y, "Recibimos de", 9, { color: MUTED });
  page.text(MARGIN + 14, y - 18, fitText(input.customer.legalName?.trim() || input.customer.name, 13, contentW - 28, true), 13, { bold: true });
  const details = [
    input.customer.legalName?.trim() && input.customer.legalName.trim() !== input.customer.name ? input.customer.name : null,
    input.customer.taxId ? `CUIT ${input.customer.taxId}` : null,
    input.customer.email,
  ].filter(Boolean) as string[];
  page.text(MARGIN + 14, y - 36, fitText(details.join(" · ") || " ", 9.5, contentW - 28), 9.5, { color: MUTED });

  // Concepto
  y -= 96;
  page.rect(MARGIN, y - 8, contentW, 24, SOFT);
  page.text(MARGIN + 10, y, "Concepto", 9, { bold: true, color: MUTED });
  page.text(PAGE_W - MARGIN - 10, y, "Importe", 9, { bold: true, color: MUTED, align: "right" });
  y -= 30;
  page.text(MARGIN + 10, y, fitText(input.concept, 11, contentW - 160, true), 11, { bold: true });
  page.text(PAGE_W - MARGIN - 10, y, money(input.total), 11, { align: "right" });
  y -= 14;
  page.line(MARGIN, y, PAGE_W - MARGIN, y);

  // Pagos recibidos
  y -= 30;
  page.text(MARGIN, y, "Pagos recibidos", 10, { bold: true });
  y -= 20;
  for (const item of input.items.slice(0, 12)) {
    const how = [item.method, item.reference].filter(Boolean).join(" · ") || "Pago";
    page.text(MARGIN + 10, y, date(item.paidAt), 10, { color: MUTED });
    page.text(MARGIN + 100, y, fitText(how, 10, contentW - 240), 10);
    page.text(PAGE_W - MARGIN - 10, y, money(item.amount), 10, { align: "right" });
    y -= 18;
  }

  // Total
  y -= 16;
  const boxW = 240;
  const boxX = PAGE_W - MARGIN - boxW;
  if (input.paid < input.total) {
    page.text(boxX + 12, y, "Falta pagar", 10, { color: MUTED });
    page.text(PAGE_W - MARGIN - 12, y, money(input.total - input.paid), 10, { align: "right" });
    y -= 28;
  }
  page.rect(boxX, y - 12, boxW, 34, ACCENT);
  page.text(boxX + 12, y, "Total pagado", 12, { bold: true, color: [1, 1, 1] });
  page.text(PAGE_W - MARGIN - 12, y, money(input.paid), 13, { bold: true, color: [1, 1, 1], align: "right" });

  // Pie
  page.line(MARGIN, 96, PAGE_W - MARGIN, 96);
  page.text(MARGIN, 80, "Este comprobante acredita un pago a Vase. No es una factura.", 9, { bold: true, color: MUTED });
  page.text(MARGIN, 66, `Código de verificación: ${receiptVerificationCode(input.paymentId, input.paid)}`, 9, { color: MUTED });
  page.text(MARGIN, 52, "Valores en pesos argentinos.", 8.5, { color: MUTED });

  return buildPdf(page, `Comprobante ${number}`);
}

function buildPdf(page: Page, title: string): Buffer {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const infoId = add(`<< /Title (${escapePdf(toWinAnsi(title))}) /Producer (Vase) >>`);
  const stream = page.ops.join("\n");
  const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  let body = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}
