import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const totalProducts = await prisma.product.count({ where: { companyId, isActive: true } })
    const locatedProducts = await prisma.warehouseProductLocation.count({ where: { companyId, active: true } })
    const devices = await prisma.warehouseDevice.count({ where: { companyId } })
    const onlineDevices = await prisma.warehouseDevice.count({ where: { companyId, status: 'ONLINE' } })

    return NextResponse.json({
      totalProducts,
      locatedProducts,
      devices,
      onlineDevices
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 })
  }
}