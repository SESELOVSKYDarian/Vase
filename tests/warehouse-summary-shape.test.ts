import { describe, expect, it } from 'vitest'
import { serializeWarehouseSummary } from '../apps/vase-management/lib/warehouse/warehouse-summary'

describe('warehouse summary serializer', () => {
  it('derives offline and missing LED counts', () => {
    expect(serializeWarehouseSummary({
      totalProducts: 10,
      locatedProducts: 7,
      productsWithLed: 4,
      devices: 3,
      onlineDevices: 1,
      recentCommands: [],
      recentConversations: [],
    })).toMatchObject({
      productsWithoutLed: 6,
      offlineDevices: 2,
    })
  })
})
