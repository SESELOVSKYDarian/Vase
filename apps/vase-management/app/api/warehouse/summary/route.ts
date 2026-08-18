import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serializeWarehouseSummary } from '@/lib/warehouse/warehouse-summary'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const companyId = session.user.companyId

    const [
      totalProducts,
      locatedProducts,
      productsWithLed,
      devices,
      onlineDevices,
      recentCommands,
      recentConversations,
    ] = await prisma.$transaction([
      prisma.product.count({ where: { companyId, isActive: true } }),
      prisma.warehouseProductLocation.count({ where: { companyId, active: true } }),
      prisma.warehouseProductLocation.count({
        where: { companyId, active: true, ledNumber: { not: null }, product: { isActive: true } },
      }),
      prisma.warehouseDevice.count({ where: { companyId, active: true } }),
      prisma.warehouseDevice.count({ where: { companyId, active: true, status: 'ONLINE' } }),
      prisma.warehouseLedCommand.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          ledNumber: true,
          activeCount: true,
          status: true,
          createdAt: true,
          device: { select: { name: true } },
          productLocation: {
            select: { product: { select: { code: true, name: true } } },
          },
        },
      }),
      prisma.warehouseConversationLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          channel: true,
          messageType: true,
          transcript: true,
          intent: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json(serializeWarehouseSummary({
      totalProducts,
      locatedProducts,
      productsWithLed,
      devices,
      onlineDevices,
      recentCommands,
      recentConversations,
    }))
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 })
  }
}
