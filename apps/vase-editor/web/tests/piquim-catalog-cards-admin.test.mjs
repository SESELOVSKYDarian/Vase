import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

// catalogCards.js importa los valores por defecto con una ruta sin extension: se arma un modulo con ambos archivos.
async function loadCatalogCards() {
    const branding = (await read('../src/data/piquimBranding.js')).replace(/export const PIQUIM_FOOTER_DEFAULTS[\s\S]*$/, '');
    const cards = (await read('../src/utils/catalogCards.js')).replace(/^import .*$/m, '');
    const source = `${branding}\n${cards}`;
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('sin nada guardado la portada usa las dos tarjetas por defecto', async () => {
    const { resolveCatalogCards, getVisibleCatalogCards } = await loadCatalogCards();
    for (const configured of [undefined, null, []]) {
        const cards = resolveCatalogCards(configured);
        assert.deepEqual(cards.map((card) => card.id), ['heladeria', 'panaderia']);
        assert.ok(cards.every((card) => card.hidden === false && card.image && card.tags.length));
        assert.equal(getVisibleCatalogCards(configured).length, 2);
    }
});

test('lo guardado en el panel pisa titulo, prefijo, etiquetas, descripcion e imagen', async () => {
    const { getVisibleCatalogCards } = await loadCatalogCards();
    const [heladeria, panaderia] = getVisibleCatalogCards([
        { id: 'heladeria', title: 'Helados', prefix: '01 - Nuevo', tags: 'Pulpas, Bases', description: 'Texto nuevo', image: 'https://uploads.vase.ar/h.jpg' },
        { id: 'panaderia', title: 'Panaderia', image: '/otra.jpg' },
    ]);
    assert.equal(heladeria.title, 'Helados');
    assert.equal(heladeria.prefix, '01 - Nuevo');
    assert.deepEqual(heladeria.tags, ['Pulpas', 'Bases']);
    assert.equal(heladeria.description, 'Texto nuevo');
    assert.equal(heladeria.image, 'https://uploads.vase.ar/h.jpg');
    assert.equal(panaderia.title, 'Panaderia');
    assert.equal(panaderia.image, '/otra.jpg');
    // lo que no se toco conserva el valor por defecto
    assert.equal(panaderia.prefix, '02 - Hornear y decorar');
    assert.equal(panaderia.categorySlug, 'panaderia');
});

test('una tarjeta oculta sale de la portada pero conserva su contenido; un titulo vacio vuelve al original', async () => {
    const { getVisibleCatalogCards, resolveCatalogCards } = await loadCatalogCards();
    const saved = [
        { id: 'heladeria', title: '   ', hidden: true, tags: [] },
        { id: 'panaderia' },
    ];
    assert.deepEqual(getVisibleCatalogCards(saved).map((card) => card.id), ['panaderia']);
    const hidden = resolveCatalogCards(saved)[0];
    assert.equal(hidden.hidden, true);
    assert.equal(hidden.title, 'Heladeria');
    assert.deepEqual(hidden.tags, []);
    assert.equal(getVisibleCatalogCards(saved.map((card) => ({ ...card, hidden: true }))).length, 0);
});

test('el panel tiene la seccion Pagina catalogo solo para Piquim y la portada respeta las tarjetas ocultas', async () => {
    const sidebar = await read('../src/components/admin/evolution/EvolutionSidebar.jsx');
    assert.match(sidebar, /showCatalogPage\s*\n?\s*\?\s*\[\{ id: 'catalog_page'/);
    const admin = await read('../src/pages/admin/evolution/EvolutionAdmin.jsx');
    assert.match(admin, /case 'catalog_page':[\s\S]*<CatalogPageEditor/);
    assert.match(admin, /showCatalogPage=\{isPiquimStore\}/);

    const page = await read('../src/pages/store/CatalogPage.jsx');
    assert.match(page, /getVisibleCatalogCards\(settings\?\.branding\?\.catalog_cards\)/);
    assert.match(page, /isPiquimTenant && isCatalogLanding && catalogCards\.length > 0/);
    assert.doesNotMatch(page, /combinedPanaderia/);
    assert.match(page, /cards\.length > 1 \? "lg:grid-cols-2" : ""/);
});

test('el editor sube la imagen al servidor de archivos y guarda la URL', async () => {
    const editor = await read('../src/components/admin/evolution/CatalogPageEditor.jsx');
    assert.match(editor, /uploadPublicFile\(file\)/);
    for (const label of ['Titulo', 'Prefijo', 'Etiquetas', 'Descripcion']) {
        assert.ok(editor.includes(label), label);
    }
    assert.match(editor, /hidden: !card\.hidden/);
});
