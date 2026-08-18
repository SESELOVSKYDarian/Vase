import type { Prisma } from '@prisma/client'

export function buildWarehouseProductWhere(
  companyId: string,
  query: string,
  filters: { sectorId?: string; rack?: string },
): Prisma.ProductWhereInput {
  const q = query.trim()
  const sectorId = filters.sectorId?.trim()
  const rack = filters.rack?.trim()
  const locationFilter = sectorId || rack
    ? {
        warehouseLocations: {
          some: {
            active: true,
            ...(sectorId ? { sectorId } : {}),
            ...(rack ? { rack } : {}),
          },
        },
      }
    : {}

  return {
    companyId,
    isActive: true,
    ...(q ? {
      OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
    ...locationFilter,
  }
}
