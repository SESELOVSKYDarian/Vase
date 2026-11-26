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
/** En fondos claros (blancos) se tolera un poco más, para llevarse también la sombra suave del producto. */
const LIGHT_TOLERANCE = 62;
/** Aire alrededor del producto en la foto final (parte del lado más largo), para que la tarjeta no lo corte. */
const PADDING = 0.12;
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
export function floodRemove(data, width, height, color, tolerance = TOLERANCE, isShadow = null) {
  const total = width * height;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  for (const position of borderPixels(width, height)) {
    if (!removed[position] && colorDistance(data, position * 4, color) <= tolerance) {
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
      // Fondo, o sombra muy clara pegada al fondo (solo en fondos blancos).
      if (colorDistance(data, next * 4, color) <= tolerance || (isShadow && isShadow(data, next * 4))) {
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
      const keep = Math.min(1, Math.max(0.35, (distance - tolerance) / (tolerance * 2)));
      data[index + 3] = Math.round(data[index + 3] * keep);
    }
  }
  return count;
}

/**
 * Borra manchitas sueltas que no son parte del producto (marcas de agua chicas, textos, puntos):
 * todo grupo de píxeles visibles que sea mucho más chico que el producto principal.
 * Modifica `data` en el lugar.
 */
export function removeSpecks(data, width, height, minShare = 0.02) {
  const total = width * height;
  const label = new Int32Array(total).fill(-1);
  const sizes = [];
  const queue = new Int32Array(total);
  for (let start = 0; start < total; start += 1) {
    if (label[start] !== -1 || data[start * 4 + 3] < 24) continue;
    const id = sizes.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const position = queue[head++];
      const x = position % width;
      const neighbours = [x > 0 ? position - 1 : -1, x < width - 1 ? position + 1 : -1, position - width, position + width];
      for (const next of neighbours) {
        if (next < 0 || next >= total || label[next] !== -1 || data[next * 4 + 3] < 24) continue;
        label[next] = id;
        queue[tail++] = next;
      }
    }
    sizes.push(tail);
  }
  if (sizes.length < 2) return 0;
  const largest = sizes.reduce((max, size) => (size > max ? size : max), 0);
  const minimum = Math.max(30, largest * minShare);
  let cleared = 0;
  for (let position = 0; position < total; position += 1) {
    const id = label[position];
    if (id >= 0 && sizes[id] < minimum) {
      data[position * 4 + 3] = 0;
      cleared += 1;
    }
  }
  return cleared;
}

/**
 * Quita el fondo liso de una imagen. Devuelve:
 * - { status: 'removed', buffer } con la foto en WebP transparente, cuadrada y con el producto centrado;
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

  const luminance = 0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2];
  const light = luminance > 200;
  // En fondo blanco, la sombra suave (gris muy clara y sin color) también se va.
  const isShadow = light
    ? (pixels, index) => {
        const max = Math.max(pixels[index], pixels[index + 1], pixels[index + 2]);
        const min = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
        const lum = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
        return max - min < 14 && lum > 195;
      }
    : null;
  const removed = floodRemove(data, width, height, background, light ? LIGHT_TOLERANCE : TOLERANCE, isShadow);
  const ratio = removed / (width * height);
  // Si se iría casi toda la imagen, el producto es del mismo color que el fondo: mejor no tocar.
  if (ratio > 0.97) return { status: 'skipped', reason: 'product_same_color_as_background' };
  if (ratio < 0.02) return { status: 'skipped', reason: 'no_background_found' };
  removeSpecks(data, width, height);

  // Recorta al ras del producto y lo centra en un cuadrado con aire alrededor: así todas las fotos
  // del catálogo quedan del mismo tamaño y la tarjeta no le corta partes.
  const trimmed = await sharp(data, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  const side = Math.ceil(Math.max(trimmed.info.width, trimmed.info.height) * (1 + PADDING * 2));
  const left = Math.floor((side - trimmed.info.width) / 2);
  const top = Math.floor((side - trimmed.info.height) / 2);
  const buffer = await sharp(trimmed.data)
    .extend({ top, bottom: side - trimmed.info.height - top, left, right: side - trimmed.info.width - left, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();
  return { status: 'removed', buffer, background: background.map(Math.round) };
}
