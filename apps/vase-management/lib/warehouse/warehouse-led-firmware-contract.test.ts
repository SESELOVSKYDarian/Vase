import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const firmware = readFileSync('firmware/warehouse-esp32/warehouse-esp32.ino', 'utf8')

assert.match(firmware, /INITIAL_LED_COUNT = 100/)
assert.ok(firmware.includes('command["ledNumbers"]'))
assert.ok(firmware.includes('for (JsonVariant value : ledNumbers)'))
assert.ok(firmware.includes('strip.setPixelColor(index'))
assert.ok(firmware.includes('#include <WebServer.h>'))
assert.ok(firmware.includes('WIFI Damac N4164 '))
assert.ok(firmware.includes('const char* FALLBACK_WIFI_SSID'))
assert.ok(firmware.includes('Preferences'))
assert.ok(firmware.includes('WiFi.softAP'))
assert.ok(firmware.includes('color["r"]'))

console.log('warehouse firmware exact LED contract: ok')
