// app/api/productos/barcode/route.ts
//
// Busca un producto por código de barras. Soporta dos casos:
//   1. Product.barcode coincide directamente (código propio del producto).
//   2. BarcodeAlias coincide (código de un packaging distinto — ej: la caja
//      de 12 unidades tiene su propio EAN, escanearla debe reconocer el
//      producto base y multiplicar la cantidad).

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.trim()
    if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

    // 1. Coincidencia directa por Product.barcode
    const direct = await prisma.product.findFirst({
      where: { companyId: session.user.companyId, barcode: code, isActive: true },
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
    })
    if (direct) {
      return NextResponse.json({ data: { product: direct, quantity: 1, matchType: 'direct' } })
    }

    // 2. Coincidencia por alias de packaging (ej: código de la caja)
    const alias = await prisma.barcodeAlias.findFirst({
      where: { barcode: code, isActive: true, product: { companyId: session.user.companyId, isActive: true } },
      include: { product: { include: { category: { select: { name: true } }, brand: { select: { name: true } } } } },
    })
    if (alias) {
      return NextResponse.json({
        data: { product: alias.product, quantity: Number(alias.quantity), matchType: 'alias', packaging: alias.packaging },
      })
    }

    return NextResponse.json({ error: 'Producto no encontrado para este código de barras', code }, { status: 404 })
  } catch (err) {
    console.error('[GET /api/productos/barcode]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
