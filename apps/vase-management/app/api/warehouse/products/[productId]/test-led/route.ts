import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseService } from '@/lib/warehouse/warehouse.service'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'
import { selectWarehouseDeviceForCommand } from '@/lib/warehouse/command-device'

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const body = await req.json().catch(() => ({})) as { color?: { r?: number; g?: number; b?: number } }
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const location = await WarehouseService.getProductLocation(session.user.companyId, params.productId)
    if (!location || location.ledNumber == null) {
      return NextResponse.json({ error: 'Producto sin ubicación o LED' }, { status: 400 })
    }

    const devices = await WarehouseDeviceService.listDevices(session.user.companyId)
    const onlineDevice = selectWarehouseDeviceForCommand(devices)

    if (!onlineDevice) {
      return NextResponse.json({ error: 'No hay dispositivos online con polling reciente' }, { status: 400 })
    }

    const command = await WarehouseDeviceService.createLedCommand(session.user.companyId, {
      deviceId: onlineDevice.id,
      productLocationId: location.id,
      ledNumber: location.ledNumber,
      ledNumbers: location.ledNumbers,
      activeCount: location.ledNumbers.length || 4,
      color: body.color && typeof body.color === 'object' ? {
        r: Number(body.color.r),
        g: Number(body.color.g),
        b: Number(body.color.b),
      } : undefined,
      durationMs: 5000
    })
    
    return NextResponse.json(command)
  } catch (error) {
    return NextResponse.json({ error: 'Error al probar LED' }, { status: 500 })
  }
}
