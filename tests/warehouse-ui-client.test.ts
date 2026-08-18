import { describe, expect, it } from 'vitest'
import {
  buildWarehouseProductUrl,
  WarehouseApiError,
} from '../apps/vase-management/components/warehouse/client'

describe('warehouse client helpers', () => {
  it('encodes product filters without emitting empty values', () => {
    expect(buildWarehouseProductUrl({ query: 'PC 06', sectorId: '', rack: 'A1' }))
      .toBe('/api/warehouse/products?q=PC+06&rack=A1')
  })

  it('preserves the HTTP status and server message', () => {
    const error = new WarehouseApiError('Dispositivo offline', 409)

    expect(error.message).toBe('Dispositivo offline')
    expect(error.status).toBe(409)
  })
})
