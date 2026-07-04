// app/api/compras/proveedores/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'

const supplierSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER']).default('CUIT'),
  documentNumber: z.string().optional(),
  ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_RESPONSABLE', 'SUJETO_NO_CATEGORIZADO']).default('RESPONSABLE_INSCRIPTO'),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  paymentTermDays: z.number().min(0).optional(),
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
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.supplier.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = supplierSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const data = await prisma.supplier.create({ data: { ...parsed.data, companyId: session.user.companyId } })
    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 }) }
}
