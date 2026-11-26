// Preparar el logo de una tienda para mostrarlo: recortarle el margen transparente, saber si es claro
// u oscuro y armar el favicon (ícono de la pestaña) a partir de él.
import sharp from 'sharp';

const MAX_BYTES = 5 * 1024 * 1024;
const FAVICON_DARK_BG = { r: 24, g: 20, b: 17, alpha: 1 };

/** Dominio desde el que se aceptan logos por dirección (el de las subidas de Vase). */
function allowedHost() {
  const base = process.env.UPLOADS_PUBLIC_BASE_URL || process.env.PUBLIC_UPLOADS_BASE_URL || 'https://uploads.vase.ar';
  try {
    return new URL(base).host;
  } catch {
    return 'uploads.vase.ar';
  }
}

/** true si la dirección es https y del dominio de subidas de Vase (no se descarga cualquier cosa). */
export function isAllowedLogoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.host === allowedHost();
  } catch {
    return false;
  }
}

/** Trae los bytes del logo: de una imagen incrustada (data:) o de uploads.vase.ar. null si no se puede. */
export async function loadLogoBuffer(source) {
  const value = String(source || '').trim();
  const dataMatch = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(value);
  if (dataMatch) {
    const buffer = Buffer.from(dataMatch[1], 'base64');
    return buffer.length && buffer.length <= MAX_BYTES ? buffer : null;
  }
  if (!isAllowedLogoUrl(value)) return null;
  const response = await fetch(value, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.length <= MAX_BYTES ? buffer : null;
}

/** Cuenta qué parte del logo (sin lo transparente) es clara. Devuelve 'light' o 'dark'. */
export async function measureTone(buffer) {
  const { data, info } = await sharp(buffer).resize(64, 64, { fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let visible = 0;
  let light = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    if (data[index + 3] < 60) continue;
    visible += 1;
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    if (luminance > 205) light += 1;
  }
  return visible > 0 && light / visible > 0.55 ? 'light' : 'dark';
}

/** Logo sin margen transparente, en PNG y hasta 720 px de ancho, más si es claro u oscuro. */
export async function prepareTrimmedLogo(buffer) {
  const trimmed = await sharp(buffer).trim({ threshold: 8 }).resize({ width: 720, withoutEnlargement: true }).png().toBuffer();
  return { body: trimmed, tone: await measureTone(trimmed) };
}

/**
 * Favicon cuadrado a partir del logo: centrado, con un poco de aire alrededor.
 * Si el logo es claro, va sobre un cuadrado oscuro con puntas redondeadas para que se vea en la pestaña.
 */
export async function buildLogoFavicon(buffer, size = 64) {
  const { body, tone } = await prepareTrimmedLogo(buffer);
  const inner = Math.round(size * 0.84);
  const logo = await sharp(body).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  const radius = Math.round(size * 0.22);
  const background = tone === 'light'
    ? await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="rgb(${FAVICON_DARK_BG.r},${FAVICON_DARK_BG.g},${FAVICON_DARK_BG.b})"/></svg>`)).png().toBuffer()
    : await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  return sharp(background).composite([{ input: logo, top: offset, left: offset }]).png().toBuffer();
}
