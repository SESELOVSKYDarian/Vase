// PDF del presupuesto, escrito a mano (texto, líneas y rectángulos) para no sumar dependencias.
// Usa las fuentes estándar Helvetica y Helvetica-Bold con WinAnsi, que alcanzan para el castellano.

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;

/* Anchos de Helvetica / Helvetica-Bold para los caracteres 32..126 (en milésimas del tamaño). */
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

const WIN_ANSI_EXTRA: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99,
};

/** Pasa el texto a WinAnsi (cada carácter = un byte). Lo que no entra se reemplaza. */
function toWinAnsi(text: string) {
  let out = "";
  for (const char of text.normalize("NFC")) {
    const code = char.codePointAt(0) ?? 63;
    if (WIN_ANSI_EXTRA[char]) out += String.fromCharCode(WIN_ANSI_EXTRA[char]);
    else if (code === 9 || code === 10 || code === 13) out += " ";
    else if (code >= 32 && code <= 126) out += char;
    else if (code >= 160 && code <= 255) out += char;
    else out += "?";
  }
  return out;
}

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textWidth(text: string, size: number, bold = false) {
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
  while (cut.length > 1 && textWidth(`${cut}…`, size, bold) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function wrapText(text: string, size: number, maxWidth: number, maxLines: number, bold = false) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    lines[maxLines - 1] = fitText(`${lines[maxLines - 1]} …`, size, maxWidth, bold);
  }
  return lines.map((line) => fitText(line, size, maxWidth, bold));
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

export type QuotePdfInput = {
  businessName: string;
  businessContact: string[];
  number: number;
  createdAt: Date;
  validUntil: Date;
  customerName?: string | null;
  currency: string;
  lines: Array<{ name: string; sku?: string | null; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  total: number;
  notes?: string | null;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

function date(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(value);
}

export function renderQuotePdf(input: QuotePdfInput): Buffer {
  const pages: Page[] = [];
  const contentW = PAGE_W - MARGIN * 2;
  const col = { qty: MARGIN + contentW * 0.6, unit: MARGIN + contentW * 0.8, total: PAGE_W - MARGIN };
  const number = String(input.number).padStart(4, "0");

  const header = (page: Page) => {
    page.rect(0, PAGE_H - 6, PAGE_W, 6, ACCENT);
    page.text(MARGIN, PAGE_H - 62, fitText(input.businessName, 20, contentW * 0.6, true), 20, { bold: true });
    input.businessContact.slice(0, 3).forEach((line, index) => {
      page.text(MARGIN, PAGE_H - 80 - index * 13, fitText(line, 9.5, contentW * 0.6), 9.5, { color: MUTED });
    });
    page.text(PAGE_W - MARGIN, PAGE_H - 56, "PRESUPUESTO", 10, { bold: true, color: ACCENT, align: "right" });
    page.text(PAGE_W - MARGIN, PAGE_H - 76, `N.º ${number}`, 18, { bold: true, align: "right" });
    page.text(PAGE_W - MARGIN, PAGE_H - 92, `Fecha ${date(input.createdAt)}`, 9.5, { color: MUTED, align: "right" });
    page.text(PAGE_W - MARGIN, PAGE_H - 105, `Vale hasta el ${date(input.validUntil)}`, 9.5, { color: MUTED, align: "right" });
  };

  const tableHead = (page: Page, y: number) => {
    page.rect(MARGIN, y - 8, contentW, 24, SOFT);
    page.text(MARGIN + 10, y, "Producto", 9, { bold: true, color: MUTED });
    page.text(col.qty, y, "Cant.", 9, { bold: true, color: MUTED, align: "right" });
    page.text(col.unit, y, "Precio unit.", 9, { bold: true, color: MUTED, align: "right" });
    page.text(col.total - 10, y, "Total", 9, { bold: true, color: MUTED, align: "right" });
    return y - 30;
  };

  let page = new Page();
  pages.push(page);
  header(page);
  let y = PAGE_H - 150;
  if (input.customerName?.trim()) {
    page.text(MARGIN, y, "Para", 9, { color: MUTED });
    page.text(MARGIN + 30, y, fitText(input.customerName.trim(), 11, contentW - 30, true), 11, { bold: true });
    y -= 30;
  }
  y = tableHead(page, y);

  for (const line of input.lines) {
    const nameLines = wrapText(line.name, 10.5, col.qty - MARGIN - 70, 2, true);
    const rowH = 16 + nameLines.length * 13 + (line.sku ? 12 : 0);
    if (y - rowH < 170) {
      page = new Page();
      pages.push(page);
      header(page);
      y = tableHead(page, PAGE_H - 150);
    }
    nameLines.forEach((text, index) => page.text(MARGIN + 10, y - index * 13, text, 10.5, { bold: true }));
    if (line.sku) page.text(MARGIN + 10, y - nameLines.length * 13, `SKU ${line.sku}`, 8.5, { color: MUTED });
    page.text(col.qty, y, String(line.quantity), 10.5, { align: "right" });
    page.text(col.unit, y, money(line.unitPrice, input.currency), 10.5, { align: "right" });
    page.text(col.total - 10, y, money(line.total, input.currency), 10.5, { bold: true, align: "right" });
    y -= rowH;
    page.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
  }

  y -= 8;
  const boxW = 220;
  const boxX = PAGE_W - MARGIN - boxW;
  page.text(boxX + 12, y, "Subtotal", 10, { color: MUTED });
  page.text(PAGE_W - MARGIN - 12, y, money(input.subtotal, input.currency), 10, { align: "right" });
  y -= 30;
  page.rect(boxX, y - 12, boxW, 34, ACCENT);
  page.text(boxX + 12, y, "Total", 12, { bold: true, color: [1, 1, 1] });
  page.text(PAGE_W - MARGIN - 12, y, money(input.total, input.currency), 13, { bold: true, color: [1, 1, 1], align: "right" });

  if (input.notes?.trim()) {
    y -= 44;
    page.text(MARGIN, y, "Notas", 9, { bold: true, color: MUTED });
    wrapText(input.notes.trim(), 9.5, contentW, 4).forEach((text, index) => page.text(MARGIN, y - 14 - index * 12, text, 9.5));
  }

  pages.forEach((current, index) => {
    current.line(MARGIN, 70, PAGE_W - MARGIN, 70);
    current.text(MARGIN, 54, "Precios del catálogo al día de hoy, sujetos a stock. Valores en pesos argentinos.", 8.5, { color: MUTED });
    current.text(MARGIN, 42, `Armado por el asistente de ${fitText(input.businessName, 8.5, 260)} con Vase Labs.`, 8.5, { color: MUTED });
    if (pages.length > 1) current.text(PAGE_W - MARGIN, 42, `Página ${index + 1} de ${pages.length}`, 8.5, { color: MUTED, align: "right" });
  });

  return buildPdf(pages, `Presupuesto ${number} - ${input.businessName}`);
}

function buildPdf(pages: Page[], title: string): Buffer {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const infoId = add(`<< /Title (${escapePdf(toWinAnsi(title))}) /Producer (Vase Labs) >>`);
  const pageIds: number[] = [];
  for (const page of pages) {
    const stream = page.ops.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

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
