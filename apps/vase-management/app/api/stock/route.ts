// app/api/stock/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'

const movementSchema = z.object({
  productId: z.string(),
  warehouseId: z.string().optional(),
  type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT']),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit, search } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId

    const where: any = {
      companyId,
      isActive: true,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] }),
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = movementSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const { productId, warehouseId, type, quantity, unitCost, notes } = parsed.data
    const companyId = session.user.companyId

    const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
    if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const previousStock = Number(product.stock)
    let delta = 0

    if (type === 'ENTRY') delta = quantity
    else if (type === 'EXIT') delta = -quantity
    else if (type === 'ADJUSTMENT') delta = quantity - previousStock // la cantidad ingresada ES el nuevo stock total

    const newStock = previousStock + delta

    await prisma.product.update({ where: { id: productId }, data: { stock: newStock } })
    await prisma.stockMovement.create({
      data: { companyId, warehouseId, productId, type, quantity: Math.abs(delta), unitCost, notes },
    })

    if (warehouseId) {
      await prisma.stockLevel.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        update: { quantity: { increment: delta }, available: { increment: delta } },
        create: { productId, warehouseId, quantity: delta, available: delta },
      })
    }

    return NextResponse.json({ success: true, newStock })
  } catch { return NextResponse.json({ error: 'Error al registrar movimiento' }, { status: 500 }) }
}
