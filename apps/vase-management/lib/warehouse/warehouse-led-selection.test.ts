import assert from 'node:assert/strict'
import { normalizeWarehouseLedSelection } from './warehouse-led-selection'

assert.deepEqual(normalizeWarehouseLedSelection([11, 8, 9, 10, 9], 100, 4), [8, 9, 10, 11])
assert.deepEqual(normalizeWarehouseLedSelection([], 100, 0), [])
assert.throws(() => normalizeWarehouseLedSelection([99, 100], 100, 2), /fuera de rango/)
assert.throws(() => normalizeWarehouseLedSelection([8, 9], 100, 4), /Seleccioná exactamente 4/)

console.log('warehouse led selection: ok')
