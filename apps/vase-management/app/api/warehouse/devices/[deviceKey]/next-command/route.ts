import { NextRequest, NextResponse } from 'next/server'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

// NO AUTENTICADO POR SESIÓN. SOLO POR DEVICEKEY.
export async function GET(req: NextRequest, { params }: { params: { deviceKey: string } }) {
  try {
    // Expirar viejos oportunísticamente
    await WarehouseDeviceService.expireOldCommands().catch(() => {})

    const nextCommand = await WarehouseDeviceService.claimNextCommand(params.deviceKey)
    
    if (!nextCommand) {
      return new NextResponse(null, { status: 204 }) // No Content
    }

    return NextResponse.json({
      id: nextCommand.id,
      ledNumber: nextCommand.ledNumber,
      activeCount: nextCommand.activeCount,
      color: nextCommand.color,
      durationMs: nextCommand.durationMs
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}