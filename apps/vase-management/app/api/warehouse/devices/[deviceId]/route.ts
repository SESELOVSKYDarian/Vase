import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function PATCH(req: NextRequest, { params }: { params: { deviceId: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const device = await WarehouseDeviceService.updateDeviceConfig(session.user.companyId, params.deviceId, body)
    if (!device) return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 })
    return NextResponse.json(device)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al guardar configuración' }, { status: 400 })
  }
}
