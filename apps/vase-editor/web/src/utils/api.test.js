import test from 'node:test';
import assert from 'node:assert/strict';

import { getTenantHeaders } from './api.js';

const originalWindow = globalThis.window;

function createLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function setWindowLocation({ host, hostname = host, pathname = '/', localStorage = createLocalStorage() }) {
  globalThis.window = {
    location: {
      host,
      hostname,
      pathname,
    },
    localStorage,
  };
  globalThis.localStorage = localStorage;
}

test.afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.localStorage = originalWindow?.localStorage;
});

test('getTenantHeaders sends storefront host on public tenant storefronts', () => {
  setWindowLocation({ host: 'teflon.vase.ar', pathname: '/' });

  assert.deepEqual(getTenantHeaders(), {
    'X-Storefront-Host': 'teflon.vase.ar',
  });
});

test('editor tenant-admin user tenant wins over stale active tenant', () => {
  setWindowLocation({
    host: 'editor.vase.ar',
    pathname: '/admin/evolution',
    localStorage: createLocalStorage({
      teflon_active_tenant: '11111111-1111-4111-8111-111111111111',
      teflon_user: JSON.stringify({
        role: 'tenant_admin',
        tenant_id: '22222222-2222-4222-8222-222222222222',
      }),
    }),
  });

  assert.deepEqual(getTenantHeaders(), {
    'X-Tenant-Id': '22222222-2222-4222-8222-222222222222',
  });
});

test('editor master admin can keep selected active tenant', () => {
  setWindowLocation({
    host: 'editor.vase.ar',
    pathname: '/admin/evolution',
    localStorage: createLocalStorage({
      teflon_active_tenant: '11111111-1111-4111-8111-111111111111',
      teflon_user: JSON.stringify({
        role: 'master_admin',
        tenant_id: '22222222-2222-4222-8222-222222222222',
      }),
    }),
  });

  assert.deepEqual(getTenantHeaders(), {
    'X-Tenant-Id': '11111111-1111-4111-8111-111111111111',
  });
});
