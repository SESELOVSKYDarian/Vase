// app/api/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'
import { audit } from '@/lib/audit'
import { requirePlanLimit, handlePlanLimitError } from '@/lib/plan-limits'
import { evaluateTrigger } from '@/lib/automation.service'

const customerSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Nombre requerido'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  documentType: z.enum(['CUIT', 'CUIL', 'DNI', 'PASSPORT', 'OTHER']).default('CUIT'),
  documentNumber: z.string().optional(),
  ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL', 'NO_RESPONSABLE', 'SUJETO_NO_CATEGORIZADO']).default('CONSUMIDOR_FINAL'),
  groupId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  deliveryRouteId: z.string().optional().nullable(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  creditRisk: z.enum(['BAJO', 'MEDIO', 'ALTO', 'BLOQUEADO']).optional(),
  sector: z.string().optional(),
  activity: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit, search, orderBy, orderDir } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const groupId = req.nextUrl.searchParams.get('groupId')
    const zoneId = req.nextUrl.searchParams.get('zoneId')

    const where = {
      companyId,
      isActive: req.nextUrl.searchParams.get('activos') !== 'false' ? undefined : false,
      ...(groupId && { groupId }),
      ...(zoneId && { zoneId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { documentNumber: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const validOrderFields = ['name', 'createdAt', 'totalDebt', 'creditLimit', 'lastInvoiceDate']
    const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'name'

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          group: { select: { name: true } },
          zone: { select: { name: true } },
        },
        orderBy: { [safeOrderBy]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[GET /api/clientes]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const parsed = customerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    await requirePlanLimit(session.user.companyId, 'customers')

    if (parsed.data.documentNumber) {
      const existing = await prisma.customer.findFirst({
        where: { companyId: session.user.companyId, documentNumber: parsed.data.documentNumber },
      })
      if (existing) return NextResponse.json({ error: 'Ya existe un cliente con ese documento' }, { status: 409 })
    }

    const customer = await prisma.customer.create({
      data: {
        ...parsed.data,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
        companyId: session.user.companyId,
      },
    })

    await audit({
      companyId: session.user.companyId, userId: session.user.id,
      action: 'CREATE', module: 'clientes', entityType: 'Customer', entityId: customer.id,
      newValues: customer as any,
    })

    // No bloqueante: si falla una automatización, no debe tumbar la creación
    // del cliente. Se registra el error en AutomationLog, no acá.
    evaluateTrigger('NEW_CUSTOMER', {
      companyId: session.user.companyId, entityType: 'customer', entityId: customer.id,
      data: { customerName: customer.name, documentNumber: customer.documentNumber ?? '' },
    }).catch((err) => console.error('[automation NEW_CUSTOMER]', err))

    return NextResponse.json({ data: customer, success: true }, { status: 201 })
  } catch (err) {
    const limitErr = handlePlanLimitError(err)
    if (limitErr) return limitErr
    console.error('[POST /api/clientes]', err)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
