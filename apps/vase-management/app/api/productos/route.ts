// app/api/productos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'
import { audit } from '@/lib/audit'
import { requirePlanLimit, handlePlanLimitError } from '@/lib/plan-limits'

const productSchema = z.object({
  code: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(2, 'Nombre requerido'),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  familyId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  unit: z.string().default('UN'),
  cost: z.number().min(0).default(0),
  price: z.number().min(0),
  ivaRate: z.number().min(0).max(27).default(21),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  hasSerialNumber: z.boolean().optional(),
  hasBatchControl: z.boolean().optional(),
  hasExpiry: z.boolean().optional(),
  warrantyDays: z.number().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit, search, orderBy, orderDir } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const categoryId = req.nextUrl.searchParams.get('categoryId')
    const brandId = req.nextUrl.searchParams.get('brandId')
    const lowStock = req.nextUrl.searchParams.get('lowStock') === 'true'

    const where: any = {
      companyId,
      isActive: req.nextUrl.searchParams.get('isActive') !== 'false' ? true : undefined,
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const validOrderFields = ['name', 'createdAt', 'price', 'stock', 'code']
    const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'name'

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          family: { select: { name: true } },
        },
        orderBy: { [safeOrderBy]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const filtered = lowStock
      ? data.filter((p) => Number(p.stock) <= Number(p.minStock))
      : data

    return NextResponse.json({ data: filtered, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[GET /api/productos]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    await requirePlanLimit(session.user.companyId, 'products')

    const product = await prisma.product.create({
      data: { ...parsed.data, companyId: session.user.companyId },
    })

    // Stock inicial: crear movimiento si stock > 0
    if (Number(parsed.data.stock) > 0) {
      await prisma.stockMovement.create({
        data: {
          companyId: session.user.companyId,
          productId: product.id,
          type: 'ENTRY',
          quantity: parsed.data.stock,
          unitCost: parsed.data.cost,
          reference: 'Stock inicial',
        },
      })
    }

    await audit({
      companyId: session.user.companyId, userId: session.user.id,
      action: 'CREATE', module: 'productos', entityType: 'Product', entityId: product.id,
      newValues: product as any,
    })

    return NextResponse.json({ data: product, success: true }, { status: 201 })
  } catch (err) {
    const limitErr = handlePlanLimitError(err)
    if (limitErr) return limitErr
    console.error('[POST /api/productos]', err)
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
  }
}
