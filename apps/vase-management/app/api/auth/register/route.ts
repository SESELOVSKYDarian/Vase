// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  cuit: z.string().min(11),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })

    const { name, email, password, companyName, cuit } = parsed.data

    // Verificar email único
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })

    // Verificar CUIT único
    const existingCompany = await prisma.company.findFirst({ where: { cuit } })
    if (existingCompany) return NextResponse.json({ error: 'Ya existe una empresa registrada con ese CUIT' }, { status: 409 })

    const hashedPassword = await bcrypt.hash(password, 12)

    // Obtener rol admin
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } })
    if (!adminRole) return NextResponse.json({ error: 'Error de configuración del sistema' }, { status: 500 })

    // Crear usuario, empresa y todo en una transacción
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword, emailVerified: new Date() },
      })

      const company = await tx.company.create({
        data: { name: companyName, legalName: companyName, cuit, ivaCondition: 'RESPONSABLE_INSCRIPTO' },
      })

      const branch = await tx.branch.create({
        data: { companyId: company.id, name: 'Casa Central', isMain: true },
      })

      await tx.pointOfSale.create({
        data: { branchId: branch.id, number: 1, name: 'Punto de Venta 0001' },
      })

      await tx.warehouse.create({
        data: { companyId: company.id, name: 'Depósito Central', isMain: true },
      })

      await tx.companyUser.create({
        data: { userId: user.id, companyId: company.id, roleId: adminRole.id },
      })
    })

    return NextResponse.json({ success: true, message: 'Cuenta creada exitosamente. Podés iniciar sesión.' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }
}
