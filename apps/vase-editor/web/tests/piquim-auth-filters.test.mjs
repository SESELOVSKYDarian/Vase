import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('los filtros del celular se abren y se cierran, y arrancan cerrados', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    const sidebar = source.slice(source.indexOf('function PiquimSubcatalogSidebar('), source.indexOf('function FilterGroup'));
    assert.match(sidebar, /const \[mobileOpen, setMobileOpen\] = useState\(false\)/);
    assert.match(sidebar, /aria-controls="piquim-filters-body"/);
    assert.match(sidebar, /aria-expanded=\{mobileOpen\}/);
    assert.match(sidebar, /mobileOpen \? 'flex[^']*' : 'hidden'\} w-full flex-col[^`]* lg:flex/);
    assert.match(sidebar, /lg:hidden/);
    assert.match(sidebar, /Ver \$\{resultCount\}/);
});

test('en escritorio el panel de filtros no cambia y el titulo del celular no se repite', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    const sidebar = source.slice(source.indexOf('function PiquimSubcatalogSidebar('), source.indexOf('function FilterGroup'));
    assert.match(sidebar, /pb-6 max-lg:hidden/);
    assert.match(sidebar, /min-h-\[1850px\]/);
});

test('la pagina del catalogo Piquim ya no suma un relleno de 104 px bajo el header', async () => {
    const source = await read('../src/pages/store/CatalogPage.jsx');
    assert.doesNotMatch(source, /pt-\[104px\]/);
    assert.doesNotMatch(source, /max-md:pt-\[86px\]/);
    assert.match(source, /px-\[60px\] pb-10 pt-8 max-lg:flex-col max-lg:px-5 max-lg:pt-3/);
});

test('login y registro comparten el mismo marco y no traen credenciales precargadas', async () => {
    const login = await read('../src/pages/store/LoginPage.jsx');
    const signup = await read('../src/pages/store/SignupPage.jsx');
    assert.match(login, /import AuthShell/);
    assert.match(signup, /import AuthShell/);
    assert.match(login, /useState\(''\);\s*const \[password, setPassword\] = useState\(''\)/);
    assert.doesNotMatch(login, /admin123/);
    assert.match(login, /autoComplete="current-password"/);
    assert.match(signup, /autoComplete="new-password"/);
    assert.match(signup, /<StepProgress current=\{step\}/);
});

test('los campos del registro estan asociados a su etiqueta', async () => {
    const signup = await read('../src/pages/store/SignupPage.jsx');
    const labels = [...signup.matchAll(/<label htmlFor="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(labels.length >= 14, `etiquetas asociadas: ${labels.length}`);
    for (const id of labels) {
        assert.match(signup, new RegExp(`id="${id}"`), `falta el campo ${id}`);
    }
    assert.doesNotMatch(signup, /<label className=\{labelClass\}>/);
});

test('el texto del registro y del login esta bien escrito y sin caracteres rotos', async () => {
    for (const file of ['../src/pages/store/SignupPage.jsx', '../src/pages/store/LoginPage.jsx', '../src/components/auth/AuthShell.jsx']) {
        const text = await read(file);
        assert.doesNotMatch(text, /Ã|�|^﻿/, `${file} tiene caracteres rotos`);
    }
    const signup = await read('../src/pages/store/SignupPage.jsx');
    for (const word of ['Teléfono', 'Dirección', 'Contraseña', 'Código postal', '¿A qué se dedica?']) {
        assert.ok(signup.includes(word), `falta "${word}"`);
    }
});

test('el progreso del registro es accesible y la foto de marca no se estira', async () => {
    const shell = await read('../src/components/auth/AuthShell.jsx');
    assert.match(shell, /role="group" aria-label=\{`Paso \$\{current\} de \$\{total\}`\}/);
    assert.match(shell, /sticky top-0 h-screen/);
    assert.match(shell, /aria-pressed=\{visible\}/);
    assert.match(shell, /aria-label=\{visible \? 'Ocultar contraseña' : 'Mostrar contraseña'\}/);
});
