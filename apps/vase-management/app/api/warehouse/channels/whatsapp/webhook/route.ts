import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppAdapter } from '@/lib/warehouse/channels/whatsapp.adapter'

export const dynamic = 'force-dynamic'

// GET: Centralized Meta webhook verification (hub.challenge) using global token
export async function GET(request: NextRequest) {
  const verifyToken = process.env.META_VERIFY_TOKEN || process.env.VASE_WEBHOOK_SECRET
  if (!verifyToken) {
    return new NextResponse('Verify token not configured', { status: 500 })
  }

  const result = WhatsAppAdapter.verifyWebhook(request.nextUrl.searchParams, verifyToken)
  return new NextResponse(String(result.body), { status: result.status })
}

// POST: Centralized inbound WhatsApp messages from Meta
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('x-hub-signature-256')

  const result = await WhatsAppAdapter.handleWebhookPost(rawBody, signatureHeader)
  return NextResponse.json(result.body, { status: result.status })
}
