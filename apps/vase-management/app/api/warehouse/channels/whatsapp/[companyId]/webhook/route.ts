import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppAdapter } from '@/lib/warehouse/channels/whatsapp.adapter'
import { WarehouseWebhookService } from '@/lib/warehouse/channels/webhook.service'

export const dynamic = 'force-dynamic'

// GET: Meta webhook verification (hub.challenge)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params

  const channel = await WarehouseWebhookService.resolveChannel(companyId, 'WHATSAPP')
  if (!channel || !channel.verifyToken) {
    return new NextResponse('Not configured', { status: 404 })
  }

  const result = WhatsAppAdapter.verifyWebhook(request.nextUrl.searchParams, channel.verifyToken)
  return new NextResponse(String(result.body), { status: result.status })
}

// POST: Inbound WhatsApp messages from Meta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-hub-signature-256')

  const result = await WhatsAppAdapter.handleWebhookPost(companyId, rawBody, signatureHeader)
  return NextResponse.json(result.body, { status: result.status })
}
