import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseDeviceService } from '@/lib/warehouse/warehouse-device.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || process.env.NEXTAUTH_URL
      || req.nextUrl.origin
    const devices = await WarehouseDeviceService.listDeviceSetups(session.user.companyId, baseUrl)
    return NextResponse.json(devices)
  } catch (error) {
    return NextResponse.json({ error: 'Error al listar dispositivos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const { name } = await req.json()
    const device = await WarehouseDeviceService.createDevice(session.user.companyId, name)
    return NextResponse.json(device)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear dispositivo' }, { status: 500 })
  }
}
