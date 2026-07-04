// app/api/configuracion/empresa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        branches: { include: { pointsOfSale: true } },
        _count: { select: { customers: true, products: true, sales: true } },
      },
    })

    return NextResponse.json({ data: company })
  } catch { return NextResponse.json({ error: 'Error interno' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const oldCompany = await prisma.company.findUnique({ where: { id: session.user.companyId } })

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        name: body.name,
        legalName: body.legalName,
        cuit: body.cuit,
        address: body.address,
        city: body.city,
        province: body.province,
        postalCode: body.postalCode,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logo: body.logo,
        ivaCondition: body.ivaCondition,
        settings: body.settings,
      },
    })

    await audit({
      companyId: session.user.companyId,
      userId: session.user.id,
      action: 'UPDATE',
      module: 'empresa',
      entityType: 'Company',
      entityId: company.id,
      oldValues: oldCompany as any,
      newValues: company as any,
    })

    return NextResponse.json({ data: company, success: true })
  } catch (err) {
    console.error('[PATCH /api/configuracion/empresa]', err)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
