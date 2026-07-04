// app/api/utilidades/auditoria/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const moduleFilter = searchParams.get('module') ?? undefined
    const userId = searchParams.get('userId') ?? undefined
    const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '100'))

    const logs = await getAuditLog(session.user.companyId, { module: moduleFilter, userId, limit })

    return NextResponse.json({ data: logs })
  } catch (err) {
    console.error('[GET /api/utilidades/auditoria]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
