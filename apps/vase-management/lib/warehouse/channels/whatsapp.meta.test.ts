import assert from 'node:assert/strict'

import { resolveWhatsAppVerifyToken } from './whatsapp.config'

assert.equal(
  resolveWhatsAppVerifyToken('number-specific-token', 'global-token'),
  'number-specific-token',
)
assert.equal(
  resolveWhatsAppVerifyToken('', 'global-token'),
  'global-token',
)

console.log('whatsapp meta helpers: ok')
