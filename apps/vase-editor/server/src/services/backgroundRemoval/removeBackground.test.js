// Quitado de fondo: fondo liso se va, fotos con ambiente no se tocan, el producto no se agujerea.
import sharp from 'sharp';
import assert from 'node:assert/strict';
import test from 'node:test';
import { removeSolidBackground } from './removeBackground.js';

/** Foto de prueba: un cuadrado de color (el "producto") en el medio de un fondo liso. */
async function productOn(background, product = { r: 220, g: 40, b: 40 }) {
  const square = await sharp({ create: { width: 80, height: 80, channels: 3, background: product } }).png().toBuffer();
  return sharp({ create: { width: 200, height: 200, channels: 3, background } })
    .composite([{ input: square, top: 60, left: 60 }])
    .png()
    .toBuffer();
}

test('saca un fondo negro y deja solo el producto, recortado', async () => {
    const result = await removeSolidBackground(await productOn({ r: 0, g: 0, b: 0 }));
    assert.equal(result.status, 'removed');
    const meta = await sharp(result.buffer).metadata();
    // El cuadrado de prueba es opaco: después de recortar no queda fondo, solo el producto.
    // Cuadrada, con el producto (80 px) centrado y algo de aire alrededor.
    assert.equal(meta.width, meta.height);
    assert.ok(meta.width > 80 && meta.width <= 104, `ancho ${meta.width}`);
    const { data } = await sharp(result.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const middle = Math.floor(meta.width / 2);
    const center = (middle * meta.width + middle) * 4;
    assert.equal(data[center + 3], 255);
    assert.ok(data[center] > 180);
  });

test('también saca un fondo blanco', async () => {
    const result = await removeSolidBackground(await productOn({ r: 255, g: 255, b: 255 }));
    assert.equal(result.status, 'removed');
  });

test('no toca una foto cuyo borde no es parejo', async () => {
    const noisy = await sharp({ create: { width: 120, height: 120, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 90 } } }).png().toBuffer();
    const result = await removeSolidBackground(noisy);
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'background_not_solid');
  });

test('no toca una foto que ya es transparente', async () => {
    const transparent = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const result = await removeSolidBackground(transparent);
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'already_transparent');
  });

test('borra manchitas sueltas (como una marca de agua chica) y deja el producto centrado', async () => {
  const square = await sharp({ create: { width: 80, height: 80, channels: 3, background: { r: 220, g: 40, b: 40 } } }).png().toBuffer();
  const speck = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 200, b: 200 } } }).png().toBuffer();
  const photo = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: square, top: 40, left: 40 }, { input: speck, top: 180, left: 180 }])
    .png()
    .toBuffer();
  const result = await removeSolidBackground(photo);
  assert.equal(result.status, 'removed');
  const meta = await sharp(result.buffer).metadata();
  // Sin la manchita, el recorte es solo el cuadrado (80 px) con su aire: no llega a la esquina.
  assert.ok(meta.width <= 104, `ancho ${meta.width}`);
});
