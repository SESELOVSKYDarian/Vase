import assert from 'node:assert/strict'
import { isWarehouseDeviceOnline, selectWarehouseDeviceForCommand } from './command-device'

const now = Date.now()
const staleDevice = { id: 'stale', active: true, status: 'ONLINE', lastSeenAt: new Date(now - 60_000) }
const currentDevice = { id: 'current', active: true, status: 'ONLINE', lastSeenAt: new Date(now - 1_000) }
assert.equal(isWarehouseDeviceOnline(staleDevice, now), false)
assert.equal(selectWarehouseDeviceForCommand([staleDevice, currentDevice], now)?.id, 'current')
assert.equal(selectWarehouseDeviceForCommand([{ id: 'inactive', active: false, status: 'ONLINE', lastSeenAt: new Date(now) }]), null)

console.log('warehouse command device selection: ok')
