import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseChannelService } from '@/lib/warehouse/warehouse-channel.service'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const body = await req.json()
    
    if (body.proposal) {
      const response = await WarehouseChannelService.executeProposal(session.user.companyId, body.proposal)
      return NextResponse.json(response)
    }

    const response = await WarehouseChannelService.processCommand(session.user.companyId, body.text)
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: 'Error procesando comando AI' }, { status: 500 })
  }
}