import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { domainError, domainKind, domainStatus, isPlaceholderValue, isValidDomain, normalizeDomainInput, observedText, sortDomains } from '../src/panel/dominio.js';

test('limpia y valida lo que se escribe', () => {
    assert.equal(normalizeDomainInput(' https://WWW.Piquim.ar/catalog '), 'www.piquim.ar');
    assert.equal(isValidDomain('piquim.ar'), true);
    assert.equal(isValidDomain('tienda.com.ar'), true);
    assert.equal(isValidDomain('piquim'), false);
    assert.equal(isValidDomain('mi tienda.com'), false);
});

test('ordena y describe las direcciones', () => {
    const domains = [
        { domain: 'piquim.vase.ar', connection_type: 'platform' },
        { domain: 'www.piquim.ar', connection_type: 'custom', mode: 'subdomain' },
        { domain: 'piquim.ar', connection_type: 'custom', mode: 'apex', is_primary: true },
    ];
    assert.deepEqual(sortDomains(domains).map((item) => item.domain), ['piquim.ar', 'www.piquim.ar', 'piquim.vase.ar']);
    assert.equal(domainKind(domains[0]), 'Dirección de Vase · siempre funciona');
    assert.equal(domainKind(domains[1]), 'Subdominio propio');
    assert.deepEqual(domainStatus({ verification: { status: 'active' } }).label, 'Conectado y seguro');
    assert.equal(domainStatus({ verification: { status: 'attention' } }).tone, 'y');
    assert.equal(observedText({ verification: { observed_records: { a: ['76.13.231.188'], cname: [] } } }), 'A → 76.13.231.188');
    assert.equal(isPlaceholderValue('tu-ip-publica'), true);
    assert.equal(isPlaceholderValue('76.13.231.188'), false);
    assert.match(domainError('domain_in_use', 'x.com'), /otra tienda/);
});

test('Dominio está en el panel nuevo', async () => {
    const app = await readFile(new URL('../src/panel/PanelApp.jsx', import.meta.url), 'utf8');
    assert.match(app, /sub === 'dominio'\) \{\s*content = <AjustesDominio/);
    const screen = await readFile(new URL('../src/panel/screens/AjustesDominio.jsx', import.meta.url), 'utf8');
    for (const path of ["'/tenant/domains'", "'/tenant/domains/check'", '/primary`', "'/tenant/domains/platform'"]) assert.ok(screen.includes(path), path);
});
