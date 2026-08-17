import { NextRequest, NextResponse } from 'next/server'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

// NO AUTENTICADO POR SESIÓN. SOLO POR DEVICEKEY (vía deviceId params).
export async function POST(req: NextRequest, { params }: { params: { deviceId: string, commandId: string } }) {
  try {
    const body = await req.json()
    
    // params.deviceId is actually the deviceKey since the device will hit /api/warehouse/devices/DEVICE_KEY/commands/...
    const success = await WarehouseDeviceService.completeCommand(
      params.deviceId, 
      params.commandId, 
      { status: body.status, error: body.error }
    )
    
    if (!success) {
      return NextResponse.json({ error: 'Not found or invalid state' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
