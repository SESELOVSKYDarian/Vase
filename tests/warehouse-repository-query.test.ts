import { describe, expect, it } from 'vitest'
import { buildWarehouseProductWhere } from '../apps/vase-management/lib/warehouse/warehouse-product-query'

describe('warehouse product query', () => {
  it('lists active company products when query is empty', () => {
    expect(buildWarehouseProductWhere('company-1', '', {})).toEqual({
      companyId: 'company-1',
      isActive: true,
    })
  })

  it('applies text, sector and rack filters together', () => {
    expect(buildWarehouseProductWhere('company-1', 'PC06', {
      sectorId: 'sector-1',
      rack: 'A1',
    })).toMatchObject({
      companyId: 'company-1',
      isActive: true,
      warehouseLocations: {
        some: { active: true, sectorId: 'sector-1', rack: 'A1' },
      },
    })
  })
})
