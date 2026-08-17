import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function POST(req: NextRequest, { params }: { params: { deviceId: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const command = await WarehouseDeviceService.createLedCommand(session.user.companyId, {
      deviceId: params.deviceId,
      ledNumber: 0,
      activeCount: 100, // asume que 100 apaga todo (o el firmware interpreta negro = off)
      color: { r: 0, g: 0, b: 0 },
      durationMs: 1000
    })
    
    return NextResponse.json(command)
  } catch (error) {
    return NextResponse.json({ error: 'Error al apagar LEDs' }, { status: 500 })
  }
}