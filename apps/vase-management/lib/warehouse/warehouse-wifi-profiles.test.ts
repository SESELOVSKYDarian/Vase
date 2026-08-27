import assert from 'node:assert/strict'
import { WAREHOUSE_WIFI_PROFILE_KEYS } from './warehouse-wifi-config.ts'

assert.deepEqual(WAREHOUSE_WIFI_PROFILE_KEYS, [
  ['wifiSsid', 'wifiPassword'],
  ['wifiFallbackSsid', 'wifiFallbackPassword'],
  ['wifiSecondarySsid', 'wifiSecondaryPassword'],
])

console.log('warehouse wifi profile order: ok')
