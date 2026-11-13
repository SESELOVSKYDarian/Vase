import assert from 'node:assert/strict';
import test from 'node:test';
import { applyVaseBusinessProfile, fetchVaseBusinessProfile, invalidateVaseBusinessProfile, seedFromBusinessSettings } from './vaseBusinessProfile.js';

const store = {
  branding: { name: 'Teflon viejo', footer: { contact: { phone: '111' }, socials: { instagram: 'https://instagram.com/viejo', facebook: 'https://facebook.com/f' } } },
  commerce: { phone: '111', branches: [{ id: 'b-old', name: 'Centro', address: 'Viejo 1', pickup_fee: 500, enabled: false }] },
  theme: { primary: 'red' },
};

const profile = {
  name: 'Sanitarios El Teflon',
  logoUrl: 'https://uploads.vase.ar/logo.webp',
  tagline: '',
  phone: '0223 555-0000',
  email: null,
  whatsapp: '+54 9 223 555 0000',
  socialLinks: [{ network: 'instagram', url: 'https://instagram.com/teflon' }],
  branches: [
    { id: 'v1', name: 'Centro', address: 'Av. Luro 100', phone: '', hours: 'L a V 8 a 18', isMain: true },
    { id: 'v2', name: 'Puerto', address: 'Juan B. Justo 50', phone: null, hours: null, isMain: false },
  ],
  fiscal: { legalName: 'El Teflon S.A.' },
};

test('Mi negocio pisa lo que tiene cargado y deja lo demás de la tienda', () => {
  const out = applyVaseBusinessProfile(store, profile);
  assert.equal(out.branding.name, 'Sanitarios El Teflon');
  assert.equal(out.branding.logo_url, 'https://uploads.vase.ar/logo.webp');
  assert.equal(out.branding.footer.contact.phone, '0223 555-0000');
  assert.equal(out.branding.footer.contact.address, 'Av. Luro 100');
  assert.equal(out.branding.footer.socials.instagram, 'https://instagram.com/teflon');
  assert.equal(out.branding.footer.socials.facebook, 'https://facebook.com/f', 'la red que Mi negocio no tiene se conserva');
  assert.equal(out.commerce.whatsapp_number, '+54 9 223 555 0000');
  assert.equal(out.commerce.legal_company_name, 'El Teflon S.A.');
  assert.deepEqual(out.theme, store.theme);
});

test('las sucursales salen de Mi negocio y conservan lo propio de Business', () => {
  const [centro, puerto] = applyVaseBusinessProfile(store, profile).commerce.branches;
  assert.equal(centro.id, 'b-old');
  assert.equal(centro.vase_id, 'v1');
  assert.equal(centro.address, 'Av. Luro 100');
  assert.equal(centro.pickup_fee, 500);
  assert.equal(centro.enabled, false);
  assert.equal(puerto.id, 'vase-v2');
  assert.equal(puerto.enabled, true);
});

test('sin perfil o con Mi negocio vacío, la tienda queda igual', () => {
  assert.equal(applyVaseBusinessProfile(store, null), store);
  const out = applyVaseBusinessProfile(store, { branches: [] });
  assert.equal(out.branding.name, 'Teflon viejo');
  assert.equal(out.commerce.branches[0].id, 'b-old');
});

test('arma la primera carga de Mi negocio con lo que tenía la tienda', () => {
  const seed = seedFromBusinessSettings(store);
  assert.equal(seed.name, 'Teflon viejo');
  assert.equal(seed.phone, '111');
  assert.deepEqual(seed.socialLinks.map((link) => link.network), ['instagram', 'facebook']);
  assert.deepEqual(seed.branches, [{ name: 'Centro', address: 'Viejo 1', phone: null, hours: null }]);
});

test('pide el perfil con el token y lo guarda un rato', async () => {
  process.env.SERVICE_TO_SERVICE_TOKEN = 'secreto';
  process.env.VASE_APP_INTERNAL_URL = 'https://app.vase.ar';
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls += 1;
    assert.equal(init.headers.authorization, 'Bearer secreto');
    assert.match(String(url), /globalTenantId=g1/);
    return { ok: true, json: async () => ({ profile: { name: 'X' } }) };
  };
  invalidateVaseBusinessProfile('g1');
  assert.equal((await fetchVaseBusinessProfile('g1', { fetchImpl })).name, 'X');
  await fetchVaseBusinessProfile('g1', { fetchImpl });
  assert.equal(calls, 1);
  invalidateVaseBusinessProfile('g1');
  await fetchVaseBusinessProfile('g1', { fetchImpl });
  assert.equal(calls, 2);
});

test('si app.vase.ar no responde, no rompe la tienda', async () => {
  invalidateVaseBusinessProfile('g2');
  const out = await fetchVaseBusinessProfile('g2', { fetchImpl: async () => { throw new Error('caído'); } });
  assert.equal(out, null);
});
