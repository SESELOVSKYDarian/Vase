import assert from 'node:assert/strict';
import test from 'node:test';
import { collectStoreImages, isImageUrl, productImageUrls } from './storeImages.js';

test('reconoce fotos y deja afuera las incrustadas', () => {
  assert.equal(isImageUrl('https://uploads.vase.ar/files/x'), true);
  assert.equal(isImageUrl('/public/products/1/images/0'), true);
  assert.equal(isImageUrl('data:image/png;base64,AAA'), false);
  assert.equal(isImageUrl('//otro.com/a.png'), false);
  assert.equal(isImageUrl('Texto con .jpg'), false);
});

test('las fotos de producto van por su dirección pública, aunque la consulta solo traiga cuántas son', () => {
  assert.deepEqual(productImageUrls({ id: 'p1', image_count: 2, data: {} }), ['/public/products/p1/images/0', '/public/products/p1/images/1']);
  assert.deepEqual(productImageUrls({ id: 'p2', image_count: 0, data: { image_url: 'https://cdn.x/a.jpg' } }), ['https://cdn.x/a.jpg']);
  assert.deepEqual(productImageUrls({ id: 'p3', image_count: 0, data: {} }), []);
});

test('junta las fotos de la tienda y dice dónde se usan', () => {
  const images = collectStoreImages({
    settings: { branding: { logo: 'https://cdn.x/logo.png' } },
    sections: [{ page: 'home', props: { image: 'https://cdn.x/hero.jpg', other: 'data:image/png;base64,AAA' } }],
    categories: [{ name: 'Baños', data: { image: 'https://cdn.x/banos.jpg' } }],
    products: [{ id: 'p1', name: 'Base', image_count: 1, data: {} }],
  });
  assert.deepEqual(images.map((image) => [image.src, image.groups[0], image.where[0], image.productId]), [
    ['https://cdn.x/hero.jpg', 'paginas', 'Inicio', null],
    ['https://cdn.x/logo.png', 'marca', 'Logo, colores y catálogo', null],
    ['https://cdn.x/banos.jpg', 'marca', 'Categoría Baños', null],
    ['/public/products/p1/images/0', 'productos', 'Base', 'p1'],
  ]);
});
