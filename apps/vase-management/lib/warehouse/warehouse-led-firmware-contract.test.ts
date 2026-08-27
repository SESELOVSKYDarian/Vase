import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const firmware = readFileSync('firmware/warehouse-esp32/warehouse-esp32.ino', 'utf8')

assert.match(firmware, /INITIAL_LED_COUNT = 100/)
assert.ok(firmware.includes('command["ledNumbers"]'))
assert.ok(firmware.includes('for (JsonVariant value : ledNumbers)'))
assert.ok(firmware.includes('strip.setPixelColor(index'))
assert.ok(firmware.includes('#include <WebServer.h>'))
assert.ok(firmware.includes('#include <ETH.h>'))
assert.ok(firmware.includes('#include <NetworkClientSecure.h>'))
assert.ok(firmware.includes('ETH_PHY_W5500'))
assert.ok(firmware.includes('ENABLE_ETHERNET = false'))
assert.ok(firmware.includes('INITIAL_NETWORK_MODE = "AUTO"'))
assert.ok(firmware.includes('wifiFallbackSsid'))
assert.ok(firmware.includes('wifiSecondarySsid'))
assert.ok(firmware.includes('Wi-Fi primero'))
assert.ok(firmware.includes('Preferences'))
assert.ok(firmware.includes('WiFi.softAP'))
assert.ok(firmware.includes('color["r"]'))

console.log('warehouse firmware exact LED contract: ok')
