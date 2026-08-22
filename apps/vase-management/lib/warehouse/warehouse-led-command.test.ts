import assert from 'node:assert/strict'
import { normalizeWarehouseLedCommand } from './warehouse-led-command'

const device = { ledCount: 60, maxActiveLeds: 10 }

assert.deepEqual(
  normalizeWarehouseLedCommand({ ledNumber: 59, activeCount: 4, color: { r: 0, g: 80, b: 20 }, durationMs: 5000 }, device),
  { ledNumber: 59, activeCount: 1, color: { r: 0, g: 80, b: 20 }, durationMs: 5000 },
)
assert.throws(() => normalizeWarehouseLedCommand({ ledNumber: 60, activeCount: 4, color: { r: 0, g: 80, b: 20 }, durationMs: 5000 }, device), /LED fuera de rango/)
assert.equal(normalizeWarehouseLedCommand({ ledNumber: 0, activeCount: 100, color: { r: 0, g: 0, b: 0 }, durationMs: 1000 }, device).activeCount, 60)

console.log('warehouse led command validation: ok')
