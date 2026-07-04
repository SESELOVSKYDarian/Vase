// app/api/stock/kardex/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(500, parseInt(searchParams.get('limit') ?? '200'))

    if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId: session.user.companyId },
      include: { category: true, brand: true },
    })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)

    const movements = await prisma.stockMovement.findMany({
      where: {
        productId,
        companyId: session.user.companyId,
        ...(warehouseId && { warehouseId }),
        ...(Object.keys(dateFilter).length && { date: dateFilter }),
      },
      include: { warehouse: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: limit,
    })

    // Calcular kardex con saldo acumulado
    let runningStock = 0
    const kardex = movements.map(m => {
      const qty = Number(m.quantity)
      const isEntry = ['ENTRY', 'PURCHASE', 'TRANSFER_IN', 'RETURN', 'PRODUCTION'].includes(m.type)
      const isExit = ['EXIT', 'SALE', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY', 'ADJUSTMENT'].includes(m.type)

      if (isEntry) runningStock += qty
      else if (isExit) runningStock -= qty
      else if (m.type === 'ADJUSTMENT') runningStock += qty // puede ser + o -

      const unitCost = Number(m.unitCost ?? product.cost)
      const totalValue = qty * unitCost

      return {
        id: m.id,
        date: m.date.toISOString().slice(0, 10),
        type: m.type,
        warehouse: m.warehouse?.name ?? 'Sin depósito',
        entradas: isEntry ? qty : 0,
        salidas: isExit ? qty : 0,
        ajuste: m.type === 'ADJUSTMENT' ? qty : 0,
        saldo: runningStock,
        unitCost,
        totalValue,
        reference: m.reference ?? '',
        notes: m.notes ?? '',
        batchNumber: m.batchNumber ?? '',
      }
    })

    // Niveles de stock por almacén
    const stockLevels = await prisma.stockLevel.findMany({
      where: { productId },
      include: { warehouse: { select: { name: true } } },
    })

    return NextResponse.json({
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        category: product.category?.name,
        brand: product.brand?.name,
        currentStock: Number(product.stock),
        minStock: Number(product.minStock),
        cost: Number(product.cost),
        price: Number(product.price),
      },
      kardex,
      stockLevels: stockLevels.map(sl => ({
        warehouse: sl.warehouse.name,
        quantity: Number(sl.quantity),
        reserved: Number(sl.reserved),
        available: Number(sl.available),
      })),
      summary: {
        totalEntradas: kardex.reduce((s, k) => s + k.entradas, 0),
        totalSalidas: kardex.reduce((s, k) => s + k.salidas, 0),
        stockActual: Number(product.stock),
        valorStock: Number(product.stock) * Number(product.cost),
      },
    })
  } catch (err) {
    console.error('[GET /api/stock/kardex]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
