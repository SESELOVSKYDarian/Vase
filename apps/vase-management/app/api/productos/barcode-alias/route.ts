// app/api/productos/barcode-alias/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { detectAndValidateBarcode } from '@/lib/barcode'

const aliasSchema = z.object({
  productId: z.string(),
  barcode: z.string().min(1),
  packaging: z.enum(['UNIT', 'BOX', 'PALLET']).default('UNIT'),
  quantity: z.number().positive().default(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const data = aliasSchema.parse(await req.json())

    const product = await prisma.product.findFirst({ where: { id: data.productId, companyId: session.user.companyId } })
    if (!product) return NextResponse.json({ error: 'Producto inválido' }, { status: 400 })

    const { type, valid } = detectAndValidateBarcode(data.barcode)
    if (type !== 'UNKNOWN' && !valid) {
      return NextResponse.json({ error: `El código ${data.barcode} no pasa la validación de checksum ${type}` }, { status: 400 })
    }

    const existing = await prisma.barcodeAlias.findUnique({ where: { barcode: data.barcode } })
    if (existing) return NextResponse.json({ error: 'Ese código de barras ya está en uso' }, { status: 409 })

    const alias = await prisma.barcodeAlias.create({
      data: { ...data, type: type === 'UNKNOWN' ? 'EAN13' : type },
    })

    return NextResponse.json({ data: alias, success: true }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear alias' }, { status: 500 })
  }
}
