// Quita el fondo liso de una foto de producto (negro, blanco, gris o cualquier color parejo).
//
// Cómo funciona: mira el borde de la foto. Si casi todo el borde es del mismo color, ese es el fondo.
// Desde el borde hacia adentro, vuelve transparente todo lo que se parece a ese color y está conectado
// al borde (así no le agujerea el producto si tiene partes del mismo color en el medio). Suaviza el
// contorno para que no quede serruchado y recorta el margen que sobra.
// Si el borde no es parejo (foto con ambiente, degradé fuerte), no toca nada: devuelve skipped.
import sharp from 'sharp';

const MAX_SIDE = 1400;
/** Qué tan distinto puede ser un píxel del fondo y seguir contando como fondo (0-441). */
const TOLERANCE = 46;
/** Parte del borde que tiene que ser del color del fondo para considerarlo "fondo liso". */
const UNIFORM_BORDER_RATIO = 0.82;

/** Distancia entre dos colores (cuánto se diferencian). */
function colorDistance(data, index, color) {
  const dr = data[index] - color[0];
  const dg = data[index + 1] - color[1];
  const db = data[index + 2] - color[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Posiciones (en píxeles) de todo el borde de la imagen. */
function borderPixels(width, height) {
  const positions = [];
  for (let x = 0; x < width; x += 1) positions.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y += 1) positions.push(y * width, y * width + width - 1);
  return positions;
}

/**
 * Busca el color del fondo mirando el borde. Devuelve el color si el borde es parejo,
 * 'transparent' si la foto ya no tiene fondo, o null si el fondo no es liso.
 */
export function detectSolidBackground(data, width, height, channels = 4) {
  const positions = borderPixels(width, height);
  let transparent = 0;
  const sums = [0, 0, 0];
  let opaque = 0;
  for (const position of positions) {
    const index = position * channels;
    if (data[index + 3] < 20) {
      transparent += 1;
      continue;
    }
    opaque += 1;
    sums[0] += data[index];
    sums[1] += data[index + 1];
    sums[2] += data[index + 2];
  }
  if (transparent / positions.length > 0.6) return 'transparent';
  if (!opaque) return null;
  const average = sums.map((sum) => sum / opaque);
  let matching = 0;
  for (const position of positions) {
    const index = position * channels;
    if (data[index + 3] >= 20 && colorDistance(data, index, average) <= TOLERANCE) matching += 1;
  }
  return matching / opaque >= UNIFORM_BORDER_RATIO ? average : null;
}

/**
 * Vuelve transparente el fondo conectado al borde (relleno desde los bordes) y suaviza el contorno.
 * Modifica `data` (RGBA) en el lugar. Devuelve cuántos píxeles quedaron transparentes.
 */
export function floodRemove(data, width, height, color) {
  const total = width * height;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  for (const position of borderPixels(width, height)) {
    if (!removed[position] && colorDistance(data, position * 4, color) <= TOLERANCE) {
      removed[position] = 1;
      queue[tail++] = position;
    }
  }
  while (head < tail) {
    const position = queue[head++];
    const x = position % width;
    const y = (position - x) / width;
    const neighbours = [
      x > 0 ? position - 1 : -1,
      x < width - 1 ? position + 1 : -1,
      y > 0 ? position - width : -1,
      y < height - 1 ? position + width : -1,
    ];
    for (const next of neighbours) {
      if (next < 0 || removed[next]) continue;
      if (colorDistance(data, next * 4, color) <= TOLERANCE) {
        removed[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  let count = 0;
  for (let position = 0; position < total; position += 1) {
    const index = position * 4;
    if (removed[position]) {
      data[index + 3] = 0;
      count += 1;
      continue;
    }
    // Contorno: un píxel del producto que toca el fondo queda semitransparente según cuánto se parece al fondo.
    const x = position % width;
    const touchesBackground =
      (x > 0 && removed[position - 1]) ||
      (x < width - 1 && removed[position + 1]) ||
      (position >= width && removed[position - width]) ||
      (position < total - width && removed[position + width]);
    if (touchesBackground) {
      const distance = colorDistance(data, index, color);
      const keep = Math.min(1, Math.max(0.35, (distance - TOLERANCE) / (TOLERANCE * 2)));
      data[index + 3] = Math.round(data[index + 3] * keep);
    }
  }
  return count;
}

/**
 * Quita el fondo liso de una imagen. Devuelve:
 * - { status: 'removed', buffer } con la foto en WebP transparente y sin margen;
 * - { status: 'skipped', reason } si no tiene fondo liso, ya era transparente o el fondo es casi toda la foto.
 */
export async function removeSolidBackground(input) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const background = detectSolidBackground(data, width, height, 4);
  if (background === 'transparent') return { status: 'skipped', reason: 'already_transparent' };
  if (!background) return { status: 'skipped', reason: 'background_not_solid' };

  const removed = floodRemove(data, width, height, background);
  const ratio = removed / (width * height);
  // Si se iría casi toda la imagen, el producto es del mismo color que el fondo: mejor no tocar.
  if (ratio > 0.97) return { status: 'skipped', reason: 'product_same_color_as_background' };
  if (ratio < 0.02) return { status: 'skipped', reason: 'no_background_found' };

  const buffer = await sharp(data, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();
  return { status: 'removed', buffer, background: background.map(Math.round) };
}
