import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRemoteCredentialIntrospectionRequest,
  readRemoteCredentialIntrospectionBaseUrl,
} from './remoteIntegrationAuth.shared.js';

test('builds the internal introspection request for vase-app credentials', () => {
  const request = buildRemoteCredentialIntrospectionRequest({
    token: 'vsk_live_abcd1234_secret-token-value',
    tenantSlug: 'tenant-demo',
    scope: 'products:sync',
  });

  assert.deepEqual(request, {
    tenantSlug: 'tenant-demo',
    token: 'vsk_live_abcd1234_secret-token-value',
    scope: 'products:sync',
  });
});

test('prefers the configured vase-app internal base url', () => {
  process.env.VASE_APP_INTERNAL_URL = 'https://app.vase.ar';

  assert.equal(
    readRemoteCredentialIntrospectionBaseUrl(),
    'https://app.vase.ar',
  );
});
