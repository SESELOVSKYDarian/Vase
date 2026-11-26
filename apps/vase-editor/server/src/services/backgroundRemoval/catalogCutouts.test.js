// Partes del quitado de fondo del catálogo que no usan la base: qué fotos se pueden descargar,
// cómo se reemplaza la dirección de una foto y cuándo una tienda tiene el automático prendido.
import assert from 'node:assert/strict';
import test from 'node:test';
import { imageKey, imageSource, isFetchableImageUrl, withSource } from './catalogCutouts.js';
import { isAutoRemoveEnabled } from './scheduler.js';

test('solo descarga fotos de direcciones públicas', () => {
  assert.equal(isFetchableImageUrl('https://cdn.proveedor.com/foto.jpg'), true);
  assert.equal(isFetchableImageUrl('http://fotos.erp.com.ar/a.png'), true);
  assert.equal(isFetchableImageUrl('http://localhost:3000/a.png'), false);
  assert.equal(isFetchableImageUrl('http://10.0.0.5/a.png'), false);
  assert.equal(isFetchableImageUrl('http://vase_vase-db/a.png'), false);
  assert.equal(isFetchableImageUrl('file:///etc/passwd'), false);
});

test('cambia la dirección respetando la forma de la foto', () => {
  assert.equal(withSource('https://a/x.jpg', 'https://b/y.webp'), 'https://b/y.webp');
  assert.deepEqual(withSource({ url: 'https://a/x.jpg', alt: 'Canilla' }, 'https://b/y.webp'), { url: 'https://b/y.webp', alt: 'Canilla' });
  assert.equal(imageSource({ src: ' https://a/x.jpg ' }), 'https://a/x.jpg');
  assert.equal(imageKey('https://a/x.jpg'), imageKey('https://a/x.jpg'));
  assert.notEqual(imageKey('https://a/x.jpg'), imageKey('https://a/y.jpg'));
});

test('automático: lo que eligió la tienda manda; si no eligió, vale el de entrada', () => {
  assert.equal(isAutoRemoveEnabled({ auto_remove_backgrounds: true }, 't1', []), true);
  assert.equal(isAutoRemoveEnabled({ auto_remove_backgrounds: false }, 't1', ['t1']), false);
  assert.equal(isAutoRemoveEnabled({}, 't1', ['t1']), true);
  assert.equal(isAutoRemoveEnabled(null, 't2', ['t1']), false);
});
