import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';

const { resolveHostCandidates } = await import('./tenant.js');

function createRequest(headers = {}) {
  const normalized = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    hostname: headers.hostname || '',
    get(name) {
      return normalized.get(String(name).toLowerCase()) || '';
    },
  };
}

test('resolveHostCandidates prioritizes storefront host over API host', () => {
  const req = createRequest({
    'x-storefront-host': 'teflon.vase.ar',
    host: 'editor.vase.ar',
  });

  assert.deepEqual(resolveHostCandidates(req), ['teflon.vase.ar']);
});
