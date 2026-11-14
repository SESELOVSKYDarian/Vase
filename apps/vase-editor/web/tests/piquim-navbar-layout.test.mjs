import { readSplit } from './helpers/read-split.mjs';
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
    const source = await readSplit(headerUrl);
    const piquim = source.slice(source.indexOf('if (isPiquimPreset)'), source.indexOf('if (isPiquimPreset)') + 12000);

    assert.match(piquim, /sticky top-0 z-\[1000\] isolate/);
    assert.doesNotMatch(piquim, /<nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-\[var\(--store-surface\)\]/);
    assert.match(piquim, /active \? "bg-\[var\(--store-primary\)\] text-white"/);
});

test('las páginas internas Piquim mantienen separación de flujo sin centrado vertical', async () => {
    const [storeLayout, login, signup, cart, about] = await Promise.all([
        readSplit(storeLayoutUrl),
        readSplit(loginUrl),
        readSplit(signupUrl),
        readSplit(cartUrl),
        readSplit(aboutUrl),
    ]);

    assert.match(storeLayout, /<main className="page-enter relative z-0 flex-grow">/);
    assert.match(login, /<AuthShell\s+variant="login"/);
    assert.match(signup, /<AuthShell\s+variant="signup"/);
    assert.match(cart, /isPiquim \? 'pt-8 md:pt-10'/);
    assert.match(about, /isPiquim \? 'pt-8 md:pt-10'/);
});
