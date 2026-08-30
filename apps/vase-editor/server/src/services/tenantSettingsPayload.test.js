import assert from 'node:assert/strict';
import test from 'node:test';

const payloadModule = await import('./tenantSettingsPayload.js').catch(() => null);

test('el payload de settings siempre define seo', () => {
  assert.ok(payloadModule, 'tenantSettingsPayload.js debe existir');

  const normalized = payloadModule.normalizeTenantSettingsWritePayload({
    branding: { name: 'Empresa' },
    commerce: {},
  });

  assert.deepEqual(normalized.seo, {});
  assert.equal(normalized.branding.name, 'Empresa');
});

test('el payload de settings conserva la configuracion seo recibida', () => {
  assert.ok(payloadModule, 'tenantSettingsPayload.js debe existir');

  const normalized = payloadModule.normalizeTenantSettingsWritePayload({
    seo: { title: 'Catalogo', noindex: true },
  });

  assert.deepEqual(normalized.seo, { title: 'Catalogo', noindex: true });
});
