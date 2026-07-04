// app/api/pos/buscar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()
    if (!q || q.length < 1) return NextResponse.json({ data: [] })

    // Si es todo dígitos y de longitud típica de barcode, priorizar esa búsqueda exacta
    const looksLikeBarcode = /^\d{6,14}$/.test(q)

    if (looksLikeBarcode) {
      const direct = await prisma.product.findFirst({
        where: { companyId: session.user.companyId, barcode: q, isActive: true },
      })
      if (direct) return NextResponse.json({ data: [{ ...direct, matchType: 'barcode', quantity: 1 }] })

      const alias = await prisma.barcodeAlias.findFirst({
        where: { barcode: q, isActive: true, product: { companyId: session.user.companyId, isActive: true } },
        include: { product: true },
      })
      if (alias) return NextResponse.json({ data: [{ ...alias.product, matchType: 'alias', quantity: Number(alias.quantity), packaging: alias.packaging }] })
    }

    const products = await prisma.product.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: products.map((p) => ({ ...p, matchType: 'text', quantity: 1 })) })
  } catch (err) {
    console.error('[GET /api/pos/buscar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
