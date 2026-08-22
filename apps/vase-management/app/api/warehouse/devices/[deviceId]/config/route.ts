import { NextResponse } from 'next/server'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function GET(_: Request, { params }: { params: { deviceId: string } }) {
  const config = await WarehouseDeviceService.getDeviceConfig(params.deviceId)
  if (!config) return new NextResponse(null, { status: 404 })
  return NextResponse.json(config, { headers: { 'Cache-Control': 'no-store' } })
}
