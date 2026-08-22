import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'
import { selectWarehouseDeviceForCommand } from '@/lib/warehouse/command-device'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const body = await req.json()
    if (body?.ledNumber === undefined || body?.ledNumber === null || isNaN(Number(body.ledNumber))) {
      return NextResponse.json({ error: 'ledNumber es requerido y debe ser un número' }, { status: 400 })
    }

    const ledNumber = Number(body.ledNumber)
    const devices = await WarehouseDeviceService.listDevices(companyId)
    const device = body.deviceId
      ? devices.find(d => d.id === body.deviceId)
      : selectWarehouseDeviceForCommand(devices)

    if (!device) return NextResponse.json({ error: 'No hay dispositivos' }, { status: 400 })

    const command = await WarehouseDeviceService.createLedCommand(companyId, {
      deviceId: device.id,
      ledNumber,
      activeCount: 4,
      durationMs: 5000
    })

    return NextResponse.json(command)
  } catch (error) {
    return NextResponse.json({ error: 'Error al probar LED' }, { status: 500 })
  }
}
