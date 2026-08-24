import assert from 'node:assert/strict'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/vase'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3006'

async function main() {
  const {
    buildWarehouseDeviceSetup,
    normalizeWarehouseBaseUrl,
  } = await import('./warehouse-device.service')

  const baseUrl = normalizeWarehouseBaseUrl('https://management.vase.ar/')
  assert.equal(baseUrl, 'https://management.vase.ar')

  const setup = buildWarehouseDeviceSetup({
    baseUrl,
    deviceKey: 'abc123',
    ledCount: 60,
    ledPin: 5,
  })

  assert.equal(setup.serverBaseUrl, 'https://management.vase.ar')
  assert.equal(setup.pollingUrl, 'https://management.vase.ar/api/warehouse/devices/abc123/next-command')
  assert.equal(setup.completeUrlTemplate, 'https://management.vase.ar/api/warehouse/devices/abc123/commands/{commandId}/complete')
assert.match(setup.arduinoConfig, /DEVICE_KEY = "abc123"/)
assert.match(setup.arduinoConfig, /LED_COUNT = 60/)
assert.match(setup.arduinoConfig, /LED_PIN = 5/)
assert.match(setup.arduinoConfig, /WIFI_SSID = "TU_WIFI"/)
assert.match(setup.arduinoConfig, /POLL_INTERVAL_MS = 2000/)

  const dtoSetup = buildWarehouseDeviceSetup({
    baseUrl: 'https://management.vase.ar/',
    deviceKey: 'device-secret',
    ledCount: 120,
  })

  assert.equal(dtoSetup.pollingUrl.endsWith('/device-secret/next-command'), true)
  assert.equal(dtoSetup.completeUrlTemplate.includes('{commandId}'), true)
}

void main()
