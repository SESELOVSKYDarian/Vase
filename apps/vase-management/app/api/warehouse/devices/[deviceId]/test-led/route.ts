import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { deviceId: string } },
) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const device = await prisma.warehouseDevice.findFirst({
      where: {
        id: params.deviceId,
        companyId: session.user.companyId,
        active: true,
      },
    })

    if (!device) {
      return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 })
    }
    const body = await req.json().catch(() => ({})) as { ledNumber?: number; color?: { r?: number; g?: number; b?: number } }
    const requestedLedNumber = Number(body.ledNumber)
    const ledNumber = Number.isInteger(requestedLedNumber) && requestedLedNumber >= 0
      ? requestedLedNumber
      : 0

    const command = await WarehouseDeviceService.createLedCommand(session.user.companyId, {
      deviceId: device.id,
      ledNumber,
      activeCount: Math.min(4, device.maxActiveLeds),
      color: body.color && typeof body.color === 'object' ? {
        r: Number(body.color.r),
        g: Number(body.color.g),
        b: Number(body.color.b),
      } : undefined,
      durationMs: 5000,
    })

    return NextResponse.json(command)
  } catch {
    return NextResponse.json({ error: 'Error al probar el dispositivo' }, { status: 500 })
  }
}
