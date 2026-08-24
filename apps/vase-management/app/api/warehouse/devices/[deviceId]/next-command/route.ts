import { NextRequest, NextResponse } from 'next/server'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

// NO AUTENTICADO POR SESIÓN. SOLO POR DEVICEKEY (vía params.deviceId).
export async function GET(req: NextRequest, { params }: { params: { deviceId: string } }) {
  try {
    // Expirar viejos oportunísticamente
    await WarehouseDeviceService.expireOldCommands().catch(() => {})

    // params.deviceId is actually the deviceKey since the ESP hits /api/warehouse/devices/DEVICE_KEY/next-command
    const nextCommand = await WarehouseDeviceService.claimNextCommand(params.deviceId, {
      transport: req.nextUrl.searchParams.get('transport'),
      ipAddress: req.nextUrl.searchParams.get('ip'),
    })
    
    if (!nextCommand) {
      return new NextResponse(null, { status: 204 }) // No Content
    }

    return NextResponse.json({
      id: nextCommand.id,
      ledNumber: nextCommand.ledNumber,
      ledNumbers: nextCommand.ledNumbers,
      activeCount: nextCommand.activeCount,
      color: nextCommand.color,
      durationMs: nextCommand.durationMs
    })
  } catch {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
