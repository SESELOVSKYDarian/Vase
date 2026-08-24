import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const firmware = readFileSync('firmware/warehouse-esp32/warehouse-esp32.ino', 'utf8')

assert.match(firmware, /INITIAL_LED_COUNT = 100/)
assert.ok(firmware.includes('command["ledNumbers"]'))
assert.ok(firmware.includes('for (JsonVariant value : ledNumbers)'))
assert.ok(firmware.includes('strip.setPixelColor(index'))

console.log('warehouse firmware exact LED contract: ok')
