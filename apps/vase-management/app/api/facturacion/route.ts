// app/api/facturacion/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parsePaginationParams } from '@/utils'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { assertPeriodOpen, handlePeriodClosedError } from '@/lib/fiscal-period'
import { requirePlanLimit, handlePlanLimitError } from '@/lib/plan-limits'
import { recordCustomerMovement } from '@/lib/ledger.service'
import { afipService, getTipoComprobante, getTipoDocReceptor } from '@/services/afip.service'

const invoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  ivaRate: z.number().min(0).max(27),
  subtotal: z.number(),
  ivaAmount: z.number(),
  total: z.number(),
})

const invoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  saleId: z.string().optional().nullable(),
  letter: z.enum(['A', 'B', 'C', 'M', 'E']),
  date: z.string(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { page, limit, search, orderDir } = parsePaginationParams(req.nextUrl.searchParams)
    const companyId = session.user.companyId
    const letter = req.nextUrl.searchParams.get('letra')
    const status = req.nextUrl.searchParams.get('status')

    const where: any = {
      companyId,
      ...(letter && { letter }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { cae: { contains: search } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, documentNumber: true } },
          items: true,
          user: { select: { name: true } },
          pointOfSale: { select: { number: true } },
        },
        orderBy: { date: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[GET /api/facturacion]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const ctx = await getTenantContext(session)

    const body = await req.json()
    const parsed = invoiceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const companyId = ctx.companyId

    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })

    await assertPeriodOpen(companyId, new Date(parsed.data.date))
    await requirePlanLimit(companyId, 'invoicesPerMonth')

    const pointOfSale = await prisma.pointOfSale.findFirst({ where: { branch: { companyId }, isActive: true } })
    if (!pointOfSale) return NextResponse.json({ error: 'No hay punto de venta configurado' }, { status: 400 })

    const lastInvoice = await prisma.invoice.findFirst({
      where: { companyId, type: 'INVOICE', letter: parsed.data.letter, pointOfSaleId: pointOfSale.id },
      orderBy: { number: 'desc' },
    })
    const number = (lastInvoice?.number ?? 0) + 1

    const subtotal = parsed.data.items.reduce((s, i) => s + i.subtotal, 0)
    const ivaAmount = parsed.data.items.reduce((s, i) => s + i.ivaAmount, 0)
    const total = subtotal + ivaAmount

    let customer = null
    if (parsed.data.customerId) {
      customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId } })
    }

    // ─── Autorización fiscal vía el servicio centralizado (NUNCA duplicar este mock) ───
    const startedAt = Date.now()
    let afipResponse
    let afipError: string | null = null
    try {
      afipResponse = await afipService.authorize({
        cuit: company.cuit ?? '',
        puntoVenta: pointOfSale.number,
        tipoComprobante: getTipoComprobante(parsed.data.letter),
        numero: number,
        fecha: parsed.data.date.replace(/-/g, ''),
        importeTotal: total,
        importeNeto: subtotal,
        importeIVA: ivaAmount,
        cuitReceptor: customer?.documentNumber ?? undefined,
        tipoDocReceptor: getTipoDocReceptor(customer?.ivaCondition ?? 'CONSUMIDOR_FINAL'),
      })
    } catch (svcErr: any) {
      afipError = svcErr.message
      afipResponse = { success: false, errores: [svcErr.message] } as any
    }
    const durationMs = Date.now() - startedAt

    // Log de toda solicitud a AFIP/mock, éxito o no — trazabilidad fiscal obligatoria
    await prisma.afipRequestLog.create({
      data: {
        companyId,
        service: 'WSFEv1',
        environment: process.env.AFIP_ENV ?? 'sandbox',
        success: !!afipResponse.success,
        durationMs,
        responseXml: JSON.stringify(afipResponse),
      },
    })
    if (!afipResponse.success || afipError) {
      await prisma.afipErrorLog.create({
        data: {
          companyId,
          service: 'WSFEv1',
          errorMsg: afipError ?? (afipResponse.errores ?? []).join('; ') ?? 'Error desconocido',
        },
      })
      return NextResponse.json({ error: 'No se pudo autorizar el comprobante ante AFIP/ARCA', detail: afipResponse }, { status: 502 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: parsed.data.customerId || null,
          saleId: parsed.data.saleId || null,
          userId: ctx.userId,
          pointOfSaleId: pointOfSale.id,
          type: 'INVOICE',
          letter: parsed.data.letter as any,
          number,
          date: new Date(parsed.data.date),
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          status: 'AUTHORIZED',
          subtotal,
          ivaAmount,
          total,
          balance: total,
          cae: afipResponse.cae,
          caeDueDate: afipResponse.caeFechaVto,
          qrCode: afipResponse.qrData,
          notes: parsed.data.notes,
          items: { create: parsed.data.items },
        },
        include: { customer: { select: { name: true } }, items: true },
      })

      if (parsed.data.saleId) {
        await tx.sale.update({ where: { id: parsed.data.saleId }, data: { status: 'INVOICED' } })
      }

      // Ledger: registrar el movimiento DEBE en la cuenta corriente del cliente,
      // en vez de solo incrementar un contador (esto es lo que se puede reconstruir
      // después en una auditoría o recálculo de cierre).
      if (parsed.data.customerId) {
        await recordCustomerMovement(tx, {
          companyId,
          customerId: parsed.data.customerId,
          type: 'INVOICE',
          debe: total,
          sourceType: 'invoice',
          sourceId: invoice.id,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          createdById: ctx.userId,
        })
      }

      return invoice
    })

    await audit({
      ...requestMeta(req),
      companyId, userId: ctx.userId,
      action: 'AUTHORIZE', module: 'facturacion', entityType: 'Invoice', entityId: result.id,
      newValues: { letter: result.letter, number: result.number, cae: result.cae },
    })

    return NextResponse.json({ data: result, afip: afipResponse, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const periodErr = handlePeriodClosedError(err)
    if (periodErr) return NextResponse.json({ error: periodErr.error, code: periodErr.code }, { status: periodErr.status })
    const limitErr = handlePlanLimitError(err)
    if (limitErr) return limitErr
    console.error('[POST /api/facturacion]', err)
    return NextResponse.json({ error: 'Error al emitir factura' }, { status: 500 })
  }
}
