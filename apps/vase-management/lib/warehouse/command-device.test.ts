import assert from 'node:assert/strict'
import { selectWarehouseDeviceForCommand } from './command-device'

const offlineDevice = { id: 'offline', active: true, status: 'OFFLINE' }
assert.equal(selectWarehouseDeviceForCommand([offlineDevice])?.id, 'offline')
assert.equal(selectWarehouseDeviceForCommand([{ id: 'inactive', active: false }]), null)

console.log('warehouse command device selection: ok')
