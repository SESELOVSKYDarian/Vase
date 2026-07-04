// app/api/ia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// =============================================
// ASISTENTE IA — Vase Management
// Arquitectura preparada para conectar con Anthropic API / OpenAI
// Por ahora responde con datos reales de la BD + respuestas contextuales
// =============================================

interface QueryContext {
  companyId: string
  question: string
}

async function answerWithData(ctx: QueryContext): Promise<{ answer: string; data?: any; queryType: string }> {
  const q = ctx.question.toLowerCase()
  const companyId = ctx.companyId
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // ¿Cuánto vendí este mes?
  if (q.includes('vend') && (q.includes('mes') || q.includes('hoy') || q.includes('este'))) {
    const result = await prisma.sale.aggregate({
      where: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } },
      _sum: { total: true }, _count: true,
    })
    const amount = Number(result._sum.total ?? 0)
    const count = result._count
    return {
      queryType: 'sales',
      data: { amount, count },
      answer: `📊 **Ventas del mes actual:**\n\n- **Total vendido:** $${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n- **Cantidad de operaciones:** ${count} ventas\n- **Ticket promedio:** $${count > 0 ? (amount / count).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0'}\n\nEstos datos corresponden a ventas confirmadas, entregadas o facturadas del mes en curso.`,
    }
  }

  // ¿Qué productos tienen bajo stock?
  if (q.includes('bajo stock') || q.includes('stock bajo') || q.includes('sin stock') || q.includes('falta') || q.includes('reponer')) {
    const products = await prisma.product.findMany({
      where: { companyId, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { stock: 'asc' },
      take: 20,
    })
    const critical = products.filter((p) => Number(p.stock) <= Number(p.minStock))
    if (critical.length === 0) {
      return { queryType: 'stock', answer: '✅ **¡Buenas noticias!** Todos los productos tienen stock suficiente. No hay productos por debajo del mínimo configurado.' }
    }
    const list = critical.slice(0, 8).map((p) => `- **${p.name}** (${p.code}): ${Number(p.stock).toFixed(0)} ${p.unit} (mín: ${Number(p.minStock).toFixed(0)})`).join('\n')
    return {
      queryType: 'stock',
      data: critical,
      answer: `⚠️ **Productos con stock crítico (${critical.length} productos):**\n\n${list}\n\n${critical.length > 8 ? `...y ${critical.length - 8} más.` : ''}\n\nTe recomiendo generar órdenes de compra para estos productos.`,
    }
  }

  // ¿Cuál fue mi mejor cliente?
  if (q.includes('mejor cliente') || q.includes('cliente principal') || q.includes('top cliente') || q.includes('mayor compra')) {
    const grouped = await prisma.sale.groupBy({
      by: ['customerId'],
      where: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] }, customerId: { not: null } },
      _sum: { total: true }, _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })
    if (!grouped.length) return { queryType: 'customers', answer: 'No hay ventas registradas a clientes este mes.' }
    const ids = grouped.map((g: any) => g.customerId).filter(Boolean) as string[]
    const customers = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    const list = grouped.map((g: any, i: number) => {
      const c = customers.find((c) => c.id === g.customerId)
      return `${i + 1}. **${c?.name ?? 'Desconocido'}** — $${Number(g._sum.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${g._count} compras)`
    }).join('\n')
    return {
      queryType: 'customers',
      data: grouped,
      answer: `🏆 **Top 5 clientes del mes:**\n\n${list}\n\n¿Querés ver el historial completo de alguno de estos clientes?`,
    }
  }

  // Resumen de ventas
  if (q.includes('resumen') || q.includes('resúmen') || q.includes('informe') || q.includes('balance')) {
    const [salesResult, invoiceResult, purchaseResult, cashResult] = await Promise.all([
      prisma.sale.aggregate({ where: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } }, _sum: { total: true }, _count: true }),
      prisma.invoice.aggregate({ where: { companyId, date: { gte: startOfMonth }, status: 'AUTHORIZED' }, _sum: { total: true }, _count: true }),
      prisma.purchase.aggregate({ where: { companyId, date: { gte: startOfMonth } }, _sum: { total: true } }),
      prisma.cashMovement.groupBy({ by: ['type'], where: { companyId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
    ])
    const income = cashResult.find((c: any) => c.type === 'INCOME')?._sum?.amount ?? 0
    const expense = cashResult.find((c: any) => c.type === 'EXPENSE')?._sum?.amount ?? 0
    return {
      queryType: 'general',
      answer: `📋 **Resumen del mes actual:**\n\n**Ventas:**\n- Total: $${Number(salesResult._sum.total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n- Operaciones: ${salesResult._count}\n\n**Facturación:**\n- Facturas autorizadas: ${invoiceResult._count}\n- Monto facturado: $${Number(invoiceResult._sum.total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n**Compras:**\n- Total: $${Number(purchaseResult._sum.total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n\n**Caja:**\n- Ingresos: $${Number(income).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n- Egresos: $${Number(expense).toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n- Saldo: $${(Number(income) - Number(expense)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    }
  }

  // Facturas pendientes
  if (q.includes('factura') && (q.includes('pendiente') || q.includes('cobrar') || q.includes('pagar'))) {
    const pendingSales = await prisma.sale.findMany({
      where: { companyId, status: { in: ['INVOICED', 'DELIVERED'] } },
      include: { customer: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 10,
    })
    const pending = pendingSales.filter((s: any) => Number(s.paidAmount) < Number(s.total))
    const total = pending.reduce((sum: number, s: any) => sum + Number(s.total) - Number(s.paidAmount), 0)
    return {
      queryType: 'sales',
      answer: `💳 **Cuentas por cobrar:**\n\n- **Total pendiente:** $${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n- **Cantidad de operaciones:** ${pending.length}\n\nPodés ver el detalle completo en el módulo de Tesorería → Cuentas por cobrar.`,
    }
  }

  // Productos más vendidos
  if ((q.includes('producto') && q.includes('vend')) || q.includes('top producto') || q.includes('más vendido')) {
    const items = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { companyId, date: { gte: startOfMonth }, status: { in: ['INVOICED', 'DELIVERED', 'CONFIRMED'] } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })
    if (!items.length) return { queryType: 'sales', answer: 'No hay ventas de productos este mes.' }
    const ids = items.map((i: any) => i.productId)
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, code: true } })
    const list = items.map((i: any, idx: number) => {
      const p = products.find((p) => p.id === i.productId)
      return `${idx + 1}. **${p?.name ?? '—'}** — ${Number(i._sum.quantity).toFixed(0)} unidades / $${Number(i._sum.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    }).join('\n')
    return { queryType: 'sales', answer: `🏅 **Top 5 productos más vendidos este mes:**\n\n${list}` }
  }

  // Cantidad de clientes
  if (q.includes('cuántos clientes') || q.includes('total clientes') || q.includes('cantidad de clientes')) {
    const count = await prisma.customer.count({ where: { companyId, isActive: true } })
    return { queryType: 'customers', answer: `👥 Tenés **${count} clientes activos** registrados en el sistema.` }
  }

  // Pregunta genérica / ayuda
  return {
    queryType: 'general',
    answer: `**Asistente Vase Management**\n\nPuedo ayudarte con información de tu empresa. Por ejemplo:\n\n- "¿Cuánto vendí este mes?"\n- "¿Qué productos tienen bajo stock?"\n- "¿Cuál fue mi mejor cliente?"\n- "Dame un resumen del mes"\n- "¿Qué facturas tengo pendientes?"\n- "¿Cuáles son mis productos más vendidos?"\n\n¿Sobre qué querés saber?`,
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { question } = await req.json()
    if (!question?.trim()) return NextResponse.json({ error: 'Pregunta requerida' }, { status: 400 })

    const result = await answerWithData({ companyId: session.user.companyId, question: question.trim() })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[POST /api/ia]', err)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}
