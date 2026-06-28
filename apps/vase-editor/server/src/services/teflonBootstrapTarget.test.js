import test from 'node:test';
import assert from 'node:assert/strict';

const { selectTeflonBootstrapTargetTenant } = await import('./teflonBootstrapTarget.js');

const FALLBACK_TENANT_ID = '636736e2-e135-44cd-ac5c-5d4ccb839a73';
const VASE_TEFLON_TENANT_ID = 'aa2e2d94-c7b1-4bc1-93f0-77e5003ddfe7';

test('selects the Vase-created Teflon tenant before the fixed bootstrap tenant', () => {
  const selected = selectTeflonBootstrapTargetTenant(
    [
      {
        id: FALLBACK_TENANT_ID,
        name: 'Sanitarios El Teflon',
        external_tenant_slug: null,
        domains: ['teflon.vase.ar'],
      },
      {
        id: VASE_TEFLON_TENANT_ID,
        name: 'Sanitarios El Teflon',
        external_tenant_slug: 'teflon',
        domains: ['teflon-3.vase.ar'],
      },
    ],
    FALLBACK_TENANT_ID
  );

  assert.equal(selected?.id, VASE_TEFLON_TENANT_ID);
});

test('ignores unrelated Vase tenants when choosing the Teflon bootstrap target', () => {
  const selected = selectTeflonBootstrapTargetTenant(
    [
      {
        id: '4c4d71fd-0db0-495b-9b6d-2b2b8f691bb3',
        name: 'PIQUIM',
        external_tenant_slug: 'piquim',
        domains: ['piquim.vase.ar'],
      },
      {
        id: FALLBACK_TENANT_ID,
        name: 'Sanitarios El Teflon',
        external_tenant_slug: null,
        domains: ['teflon.vase.ar'],
      },
    ],
    FALLBACK_TENANT_ID
  );

  assert.equal(selected?.id, FALLBACK_TENANT_ID);
});

test('ignores Piquin tenants even if stale Teflon branding was written before', () => {
  const selected = selectTeflonBootstrapTargetTenant(
    [
      {
        id: 'e6b2d19f-78e1-4851-b267-8f8cfda2979c',
        name: 'Sanitarios El Teflon',
        external_tenant_slug: 'piquin',
        domains: ['piquin.vase.ar'],
      },
      {
        id: FALLBACK_TENANT_ID,
        name: 'Sanitarios El Teflon',
        external_tenant_slug: null,
        domains: ['teflon.vase.ar'],
      },
    ],
    FALLBACK_TENANT_ID
  );

  assert.equal(selected?.id, FALLBACK_TENANT_ID);
});
