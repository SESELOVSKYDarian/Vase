import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseService } from '@/lib/warehouse/warehouse.service'

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const body = await req.json()
    const result = await WarehouseService.upsertProductLocation(session.user.companyId, {
      productId: params.productId,
      ...body
    })
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar ubicación' }, { status: 500 })
  }
}