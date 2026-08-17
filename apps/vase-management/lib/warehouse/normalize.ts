/**
 * Normaliza un código de producto para permitir búsquedas ignorando
 * espacios, guiones y diferencias entre mayúsculas y minúsculas.
 *
 * Ejemplo: "pc-06" -> "PC06"
 *
 * IMPORTANTE: nunca reemplaza la letra "O" por el número "0" ni viceversa,
 * ya que eso podría cambiar el significado real del código.
 */
export function normalizeCode(rawCode: string): string {
  return rawCode
    .trim()
    .toUpperCase()
    .replace(/[\s\-_./]+/g, '');
}

/**
 * Normaliza un nombre de sector para comparaciones (mayúsculas, sin acentos,
 * sin espacios extra).
 */
export function normalizeSectorName(rawName: string): string {
  return rawName
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, ' ');
}

/**
 * Palabras comunes en español que NO deben interpretarse como códigos de
 * producto aunque cumplan un patrón alfanumérico corto.
 */
const STOPWORDS = new Set([
  'DONDE',
  'ESTA',
  'ESTAN',
  'ESTOY',
  'BUSCAME',
  'BUSCAR',
  'NECESITO',
  'PREPARAR',
  'MOSTRAME',
  'PRODUCTO',
  'PRODUCTOS',
  'EL',
  'LA',
  'LOS',
  'LAS',
  'LE',
  'LES',
  'LO',
  'UN',
  'UNA',
  'UNO',
  'Y',
  'O',
  'DE',
  'DEL',
  'AL',
  'EN',
  'PARA',
  'POR',
  'CON',
  'SIN',
  'SU',
  'SUS',
  'SERIE',
  'HOLA',
  'GRACIAS',
  'PLASTICO',
  'FILA',
  'NIVEL',
  'RACK',
  'ESTANTE',
  'SECTOR',
  'CAJA',
  'NO',
  'SI',
  'ES',
  'VA',
  'YA',
  'HAY',
  'QUE',
  'COMO',
  'ESTE',
  'ESE',
  'ESA',
  'ESO',
  'ESTOS',
  'ESTAS',
  'AQUI',
  'ACA',
  'ALLI',
  'MAS',
  'MUY',
  'TODO',
  'TODA',
  'NADA',
  'ALGO',
  'TENGO',
  'QUIERO',
  'PUEDO'
]);

/**
 * Patrón para un candidato a código de producto:
 * de 2 a 3 letras seguidas de 1 a 4 dígitos, con guiones/espacios opcionales
 * en el medio (ya removidos antes de validar longitud final).
 * Ejemplos válidos: PC06, JS, RU08, FR12
 */
const CODE_PATTERN = /^[A-Z]{1,4}[0-9]{0,4}$/;

export interface ExtractedCode {
  original: string;
  normalized: string;
}

/**
 * Extrae candidatos a código de producto desde un texto libre, de forma
 * puramente determinística (sin IA). Se usa como primer intento de
 * resolución antes de recurrir al modelo de lenguaje.
 */
export function extractCandidateCodes(text: string): ExtractedCode[] {
  const tokens = text
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const found: ExtractedCode[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const cleaned = token.replace(/[¿?¡!.:]/g, '');
    if (cleaned.length === 0) continue;

    const normalized = normalizeCode(cleaned);

    if (STOPWORDS.has(normalized)) continue;
    if (!CODE_PATTERN.test(normalized)) continue;
    // Requiere al menos una letra y evita palabras de una sola letra.
    if (normalized.length < 2) continue;
    if (!/[A-Z]/.test(normalized)) continue;

    if (!seen.has(normalized)) {
      seen.add(normalized);
      found.push({ original: cleaned, normalized });
    }
  }

  return found;
}

/**
 * Determina si un mensaje parece ser una consulta directa de códigos
 * (sin necesidad de interpretación por IA), es decir, si TODO el mensaje
 * está compuesto por códigos candidatos y palabras irrelevantes cortas.
 */
export function looksLikeDirectCodeQuery(text: string): boolean {
  const candidates = extractCandidateCodes(text);
  return candidates.length > 0 && candidates.length <= 10;
}
