// app/api/stock/ajustes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { audit, requestMeta } from '@/lib/audit'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import { requirePermission, handlePermissionError, PERMISSIONS } from '@/lib/permissions'
import { applyStockMovement } from '@/lib/stock.service'

const adjustSchema = z.object({
  warehouseId: z.string().optional(),
  reason: z.enum(['DAMAGE', 'EXPIRY', 'LOSS', 'COUNT', 'OTHER']),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    expectedQty: z.number(),
    actualQty: z.number(),
  })).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { companyId: session.user.companyId },
      include: {
        warehouse: { select: { name: true } },
        items: { include: { product: { select: { name: true, code: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ data: adjustments })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const ctx = await getTenantContext(session)

    // Ajustar stock es una acción crítica: requiere el permiso stock.adjust
    // asignado explícitamente en el rol del usuario (o ser super admin).
    // Fail closed: si el usuario no tiene rol, esto rechaza.
    await requirePermission(session, PERMISSIONS.STOCK_ADJUST)

    const body = await req.json()
    const data = adjustSchema.parse(body)

    // Si algún ítem lleva el stock a 0 y quedaba con stock positivo antes,
    // es "poner stock en cero" — acción todavía más crítica (STOCK_ZERO_OUT).
    const zeroingOut = data.items.some((i) => i.expectedQty > 0 && i.actualQty === 0)
    if (zeroingOut) {
      await requirePermission(session, PERMISSIONS.STOCK_ZERO_OUT)
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.inventoryAdjustment.create({
        data: {
          companyId: ctx.companyId,
          warehouseId: data.warehouseId,
          reason: data.reason,
          notes: data.notes,
          status: 'APPLIED',
          approvedById: ctx.userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              expectedQty: item.expectedQty,
              actualQty: item.actualQty,
              difference: item.actualQty - item.expectedQty,
            })),
          },
        },
        include: { items: true },
      })

      for (const item of data.items) {
        const diff = item.actualQty - item.expectedQty
        if (diff === 0) continue

        // `quantity` va con el signo real del ajuste (positivo o negativo);
        // stock.service.ts lo aplica tal cual para type ADJUSTMENT.
        await applyStockMovement({
          tx, companyId: ctx.companyId, productId: item.productId, warehouseId: data.warehouseId,
          type: 'ADJUSTMENT', quantity: diff,
          reference: `Ajuste inventario — ${data.reason}`, notes: data.notes,
          allowNegative: true, // un ajuste es la corrección explícita del stock, no debe bloquearse por sí mismo
        })
      }

      return adj
    })

    await audit({
      ...requestMeta(req),
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: zeroingOut ? 'STOCK_ZERO_OUT' : 'STOCK_ADJUST',
      module: 'stock',
      entityType: 'InventoryAdjustment',
      entityId: adjustment.id,
      newValues: { reason: data.reason, items: data.items.length, zeroingOut },
    })

    return NextResponse.json({ data: adjustment, success: true }, { status: 201 })
  } catch (err) {
    const tenantErr = handleTenantError(err)
    if (tenantErr) return tenantErr
    const permErr = handlePermissionError(err)
    if (permErr) return permErr
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: err.errors }, { status: 400 })
    console.error('[POST /api/stock/ajustes]', err)
    return NextResponse.json({ error: 'Error al crear ajuste' }, { status: 500 })
  }
}
