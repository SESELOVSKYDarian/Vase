import { NextResponse } from 'next/server'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function GET(req: Request, { params }: { params: { deviceId: string } }) {
  const url = new URL(req.url)
  const config = await WarehouseDeviceService.getDeviceConfig(params.deviceId, {
    transport: url.searchParams.get('transport'),
    ipAddress: url.searchParams.get('ip'),
  })
  if (!config) return new NextResponse(null, { status: 404 })
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store' } })
}
