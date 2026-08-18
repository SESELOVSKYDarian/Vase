import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseService } from '@/lib/warehouse/warehouse.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const query = req.nextUrl.searchParams.get('q') || ''
    const sectorId = req.nextUrl.searchParams.get('sectorId') || undefined
    const rack = req.nextUrl.searchParams.get('rack') || undefined
    const results = await WarehouseService.searchProducts(
      session.user.companyId,
      query,
      100,
      { sectorId, rack },
    )
    
    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: 'Error al buscar productos' }, { status: 500 })
  }
}
