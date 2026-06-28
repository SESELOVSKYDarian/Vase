import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isPiquimTenantIdentity,
  resolveTenantBrandName,
  resolveTenantDesignPreset,
} from './tenantBranding.js';

test('preset, not tenant name, controls PIQUIM classification', () => {
  const tenant = {
    name: 'PIQUIM',
    external_tenant_slug: 'piquim',
  };
  const settings = {
    branding: {
      name: 'PIQUIM',
      design_preset: 'generic',
    },
  };

  assert.equal(isPiquimTenantIdentity({ tenant, settings }), false);
  assert.equal(resolveTenantDesignPreset({ tenant, settings }), 'generic');
});

test('classifies PIQUIM only when design preset is explicit', () => {
  const tenant = {
    name: 'Cliente cualquiera',
    external_tenant_slug: 'cliente-cualquiera',
  };
  const settings = {
    branding: {
      name: 'Cliente cualquiera',
      design_preset: 'piquim',
    },
  };

  assert.equal(isPiquimTenantIdentity({ tenant, settings }), true);
  assert.equal(resolveTenantDesignPreset({ tenant, settings }), 'piquim');
});

test('does not classify PIQUIN typo by name alone', () => {
  const tenant = {
    name: 'Piquin',
    external_tenant_slug: 'piquin',
  };

  assert.equal(isPiquimTenantIdentity({ tenant, settings: {} }), false);
  assert.equal(resolveTenantDesignPreset({ tenant, settings: {} }), 'generic');
});

test('keeps an explicit non-PIQUIM preset for non-PIQUIM tenants', () => {
  const tenant = {
    name: 'Sanitarios El Teflon',
    external_tenant_slug: 'teflon',
  };
  const settings = {
    branding: {
      name: 'Sanitarios El Teflon',
      design_preset: 'home_decor',
    },
  };

  assert.equal(resolveTenantDesignPreset({ tenant, settings }), 'home_decor');
});

test('external tenant name wins over stale Teflon branding name', () => {
  const tenant = {
    name: 'Cliente Nuevo',
    external_tenant_slug: 'cliente-nuevo',
  };
  const settings = {
    branding: {
      name: 'Sanitarios El Teflon',
      design_preset: 'generic',
    },
  };

  assert.equal(isPiquimTenantIdentity({ tenant, settings }), false);
  assert.equal(resolveTenantDesignPreset({ tenant, settings }), 'generic');
  assert.equal(resolveTenantBrandName({ tenant, settings }), 'Cliente Nuevo');
});
