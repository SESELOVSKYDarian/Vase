import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const headerUrl = new URL('../src/components/layout/Header.jsx', import.meta.url);
const storeLayoutUrl = new URL('../src/components/layout/StoreLayout.jsx', import.meta.url);
const loginUrl = new URL('../src/pages/store/LoginPage.jsx', import.meta.url);
const signupUrl = new URL('../src/pages/store/SignupPage.jsx', import.meta.url);
const cartUrl = new URL('../src/pages/store/CartPage.jsx', import.meta.url);
const aboutUrl = new URL('../src/pages/store/AboutPage.jsx', import.meta.url);

test('el navbar Piquim usa una capa storefront y no encierra los links en una segunda superficie', async () => {
    const source = await readFile(headerUrl, 'utf8');
    const piquim = source.slice(source.indexOf('if (isPiquimPreset)'), source.indexOf('if (isPiquimPreset)') + 12000);

    assert.match(piquim, /sticky top-0 z-\[1000\] isolate/);
    assert.doesNotMatch(piquim, /<nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-\[var\(--store-surface\)\]/);
    assert.match(piquim, /active \? "bg-\[var\(--store-primary\)\] text-white"/);
});

test('las páginas internas Piquim mantienen separación de flujo sin centrado vertical', async () => {
    const [storeLayout, login, signup, cart, about] = await Promise.all([
        readFile(storeLayoutUrl, 'utf8'),
        readFile(loginUrl, 'utf8'),
        readFile(signupUrl, 'utf8'),
        readFile(cartUrl, 'utf8'),
        readFile(aboutUrl, 'utf8'),
    ]);

    assert.match(storeLayout, /<main className="relative z-0 flex-grow">/);
    assert.match(login, /isPiquim \? 'flex justify-center px-4 pt-8 pb-16 md:pt-10'/);
    assert.match(signup, /isPiquim \? 'flex justify-center bg-gradient-to-b from-white via-gray-50 to-white p-4 pt-8 pb-16 md:pt-10'/);
    assert.match(cart, /isPiquim \? 'pt-8 md:pt-10'/);
    assert.match(about, /isPiquim \? 'pt-8 md:pt-10'/);
});
