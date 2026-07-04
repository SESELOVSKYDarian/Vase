// lib/alerts/system-alerts.ts
import { prisma } from '@/lib/prisma'
import { evaluateTrigger } from '@/lib/automation.service'

export async function generateAlerts(companyId: string): Promise<number> {
  let created = 0

  // Limpiar alertas viejas expiradas
  await prisma.systemAlert.deleteMany({
    where: { companyId, expiresAt: { lt: new Date() } },
  })

  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 864e5)
  const in7Days = new Date(now.getTime() + 7 * 864e5)

  // ── 1. Stock bajo ─────────────────────────────────────────────────
  const lowStock = await prisma.product.findMany({
    where: { companyId, isActive: true, stock: { gt: 0 } },
    select: { id: true, name: true, stock: true, minStock: true },
  })

  for (const p of lowStock) {
    if (Number(p.stock) <= Number(p.minStock) && Number(p.minStock) > 0) {
      const exists = await prisma.systemAlert.findFirst({
        where: { companyId, type: 'STOCK_BAJO', entityId: p.id, isDismissed: false },
      })
      if (!exists) {
        await prisma.systemAlert.create({
          data: {
            companyId,
            type: 'STOCK_BAJO',
            severity: Number(p.stock) === 0 ? 'ERROR' : 'WARNING',
            title: 'Stock bajo',
            message: `${p.name} tiene ${Number(p.stock)} unidades (mínimo: ${Number(p.minStock)})`,
            entityType: 'product',
            entityId: p.id,
            expiresAt: in7Days,
          },
        })
        created++
        await evaluateTrigger('LOW_STOCK', {
          companyId, entityType: 'product', entityId: p.id,
          data: { productName: p.name, currentStock: Number(p.stock), minStock: Number(p.minStock) },
        }).catch((err) => console.error('[automation LOW_STOCK]', err))
      }
    }
  }

  // ── 2. Facturas vencidas (sin cobrar) ────────────────────────────
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: 'AUTHORIZED',
      dueDate: { lt: now },
      balance: { gt: 0 },
    },
    include: { customer: { select: { name: true } } },
    take: 50,
  })

  for (const inv of overdueInvoices) {
    const exists = await prisma.systemAlert.findFirst({
      where: { companyId, type: 'FACTURA_VENCIDA', entityId: inv.id, isDismissed: false },
    })
    if (!exists) {
      await prisma.systemAlert.create({
        data: {
          companyId,
          type: 'FACTURA_VENCIDA',
          severity: 'WARNING',
          title: 'Factura vencida',
          message: `Factura ${inv.letter}${inv.number} de ${inv.customer?.name ?? 'CF'} vencida. Saldo: $${Number(inv.balance).toFixed(2)}`,
          entityType: 'invoice',
          entityId: inv.id,
          expiresAt: in7Days,
        },
      })
      created++
      await evaluateTrigger("INVOICE_OVERDUE", {
        companyId, entityType: "invoice", entityId: inv.id,
        data: { invoiceNumber: `${inv.letter}${inv.number}`, customerName: inv.customer?.name ?? "", balance: Number(inv.balance) },
      }).catch((err) => console.error("[automation INVOICE_OVERDUE]", err))
    }
  }

  // ── 3. Próximos cobros (vencen en 3 días) ────────────────────────
  const upcomingCollections = await prisma.invoice.findMany({
    where: {
      companyId,
      status: 'AUTHORIZED',
      dueDate: { gte: now, lte: in3Days },
      balance: { gt: 0 },
    },
    include: { customer: { select: { name: true } } },
    take: 30,
  })

  for (const inv of upcomingCollections) {
    const exists = await prisma.systemAlert.findFirst({
      where: { companyId, type: 'COBRO_PROXIMO', entityId: inv.id, isDismissed: false },
    })
    if (!exists) {
      const daysLeft = Math.ceil((inv.dueDate!.getTime() - now.getTime()) / 864e5)
      await prisma.systemAlert.create({
        data: {
          companyId,
          type: 'COBRO_PROXIMO',
          severity: 'INFO',
          title: 'Cobro próximo',
          message: `Factura de ${inv.customer?.name ?? 'CF'} vence en ${daysLeft} día(s). Saldo: $${Number(inv.balance).toFixed(2)}`,
          entityType: 'invoice',
          entityId: inv.id,
          expiresAt: inv.dueDate!,
        },
      })
      created++
    }
  }

  // ── 4. Próximos pagos a proveedores ──────────────────────────────
  const upcomingPayments = await prisma.purchase.findMany({
    where: {
      companyId,
      status: { in: ['PENDING', 'PARTIAL', 'RECEIVED'] },
      dueDate: { gte: now, lte: in3Days },
      balance: { gt: 0 },
    },
    include: { supplier: { select: { name: true } } },
    take: 30,
  })

  for (const pur of upcomingPayments) {
    const exists = await prisma.systemAlert.findFirst({
      where: { companyId, type: 'PAGO_PROXIMO', entityId: pur.id, isDismissed: false },
    })
    if (!exists) {
      const daysLeft = Math.ceil((pur.dueDate!.getTime() - now.getTime()) / 864e5)
      await prisma.systemAlert.create({
        data: {
          companyId,
          type: 'PAGO_PROXIMO',
          severity: 'WARNING',
          title: 'Pago próximo',
          message: `Pago a ${pur.supplier.name} vence en ${daysLeft} día(s). Saldo: $${Number(pur.balance).toFixed(2)}`,
          entityType: 'purchase',
          entityId: pur.id,
          expiresAt: pur.dueDate!,
        },
      })
      created++
    }
  }

  // ── 5. Cumpleaños de clientes (hoy) ──────────────────────────────
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()

  const birthdayCustomers = await prisma.customer.findMany({
    where: { companyId, isActive: true, birthDate: { not: null } },
    select: { id: true, name: true, birthDate: true },
  })

  for (const c of birthdayCustomers) {
    if (!c.birthDate) continue
    const bMonth = c.birthDate.getMonth() + 1
    const bDay = c.birthDate.getDate()
    if (bMonth === todayMonth && bDay === todayDay) {
      const exists = await prisma.systemAlert.findFirst({
        where: { companyId, type: 'CUMPLEANOS_CLIENTE', entityId: c.id, createdAt: { gte: new Date(now.setHours(0,0,0,0)) } },
      })
      if (!exists) {
        await prisma.systemAlert.create({
          data: {
            companyId,
            type: 'CUMPLEANOS_CLIENTE',
            severity: 'INFO',
            title: '🎂 Cumpleaños',
            message: `¡Hoy es el cumpleaños de ${c.name}! Es una buena oportunidad para contactarlo.`,
            entityType: 'customer',
            entityId: c.id,
            expiresAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        })
        created++
      }
    }
  }

  // ── 5b. Productos con lotes próximos a vencer ────────────────────
  const expiringBatches = await prisma.productBatch.findMany({
    where: {
      isActive: true,
      quantity: { gt: 0 },
      expiryDate: { not: null, gte: now, lte: in7Days },
      product: { companyId, isActive: true },
    },
    include: { product: { select: { id: true, name: true } } },
    take: 50,
  })

  for (const batch of expiringBatches) {
    const exists = await prisma.systemAlert.findFirst({
      where: { companyId, type: 'PRODUCTO_POR_VENCER', entityId: batch.id, isDismissed: false },
    })
    if (!exists) {
      const daysLeft = Math.ceil((batch.expiryDate!.getTime() - now.getTime()) / 864e5)
      await prisma.systemAlert.create({
        data: {
          companyId,
          type: 'PRODUCTO_POR_VENCER',
          severity: daysLeft <= 2 ? 'ERROR' : 'WARNING',
          title: 'Producto por vencer',
          message: `Lote ${batch.batchNumber} de ${batch.product.name} vence en ${daysLeft} día(s) (${Number(batch.quantity)} unidades)`,
          entityType: 'productBatch',
          entityId: batch.id,
          expiresAt: batch.expiryDate!,
        },
      })
      created++
      await evaluateTrigger('PRODUCT_EXPIRING', {
        companyId, entityType: 'productBatch', entityId: batch.id,
        data: { productName: batch.product.name, batchNumber: batch.batchNumber, daysLeft, quantity: Number(batch.quantity) },
      }).catch((err) => console.error('[automation PRODUCT_EXPIRING]', err))
    }
  }

  // ── 6. Clientes cerca del límite de crédito ──────────────────────
  const creditWarning = await prisma.customer.findMany({
    where: {
      companyId,
      isActive: true,
      creditLimit: { gt: 0 },
    },
    select: { id: true, name: true, creditLimit: true, totalDebt: true },
  })

  for (const c of creditWarning) {
    const limit = Number(c.creditLimit)
    const debt = Number(c.totalDebt)
    if (limit > 0 && debt / limit >= 0.9) {
      const exists = await prisma.systemAlert.findFirst({
        where: { companyId, type: 'LIMITE_CREDITO', entityId: c.id, isDismissed: false },
      })
      if (!exists) {
        await prisma.systemAlert.create({
          data: {
            companyId,
            type: 'LIMITE_CREDITO',
            severity: debt >= limit ? 'ERROR' : 'WARNING',
            title: 'Límite de crédito',
            message: `${c.name} usó ${Math.round(debt/limit*100)}% de su crédito ($${debt.toFixed(2)} / $${limit.toFixed(2)})`,
            entityType: 'customer',
            entityId: c.id,
            expiresAt: in7Days,
          },
        })
        created++
        await evaluateTrigger("CREDIT_LIMIT_EXCEEDED", {
          companyId, entityType: "customer", entityId: c.id,
          data: { customerName: c.name, currentDebt: debt, creditLimit: limit },
        }).catch((err) => console.error("[automation CREDIT_LIMIT_EXCEEDED]", err))
      }
    }
  }

  return created
}
