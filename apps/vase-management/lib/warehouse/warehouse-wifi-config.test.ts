import assert from 'node:assert/strict'
import { normalizeWarehouseWifiSsid } from './warehouse-wifi-config'

assert.equal(normalizeWarehouseWifiSsid('WIFI Damac N4164 '), 'WIFI Damac N4164 ')
assert.equal(normalizeWarehouseWifiSsid('  Red interna  '), '  Red interna  ')
assert.equal(normalizeWarehouseWifiSsid(''), null)
assert.equal(normalizeWarehouseWifiSsid(undefined), undefined)

console.log('warehouse wifi ssid preservation: ok')
