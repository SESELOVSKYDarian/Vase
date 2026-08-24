import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'
import { selectWarehouseDeviceForCommand } from '@/lib/warehouse/command-device'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId
    const devices = await WarehouseDeviceService.listDevices(companyId)
    const device = selectWarehouseDeviceForCommand(devices) ?? devices.find((item) => item.active) ?? null
    const locations = await prisma.warehouseProductLocation.findMany({
      where: { companyId, active: true },
      select: {
        productId: true,
        ledNumber: true,
        ledNumbers: true,
        product: { select: { code: true, name: true } },
      },
    })
    return NextResponse.json({
      device: device ? { id: device.id, name: device.name, ledCount: device.ledCount, maxActiveLeds: device.maxActiveLeds, status: device.status } : null,
      assignments: locations.map((location) => ({
        productId: location.productId,
        productCode: location.product.code,
        productName: location.product.name,
        ledNumbers: location.ledNumbers.length ? location.ledNumbers : location.ledNumber == null ? [] : [location.ledNumber],
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al cargar mapa LED' }, { status: 500 })
  }
}
