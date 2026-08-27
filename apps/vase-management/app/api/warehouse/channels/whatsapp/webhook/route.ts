import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppAdapter } from '@/lib/warehouse/channels/whatsapp.adapter'
import { WarehouseWebhookService } from '@/lib/warehouse/channels/webhook.service'

export const dynamic = 'force-dynamic'

// GET: Meta webhook verification using the channel key (with global fallback).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const globalToken = process.env.META_VERIFY_TOKEN || process.env.VASE_WEBHOOK_SECRET
  const channel = token ? await WarehouseWebhookService.resolveWhatsAppChannelByVerifyToken(token) : null
  const verifyToken = WhatsAppAdapter.resolveWebhookVerifyToken(channel?.verifyToken, globalToken)
  if (!verifyToken) return new NextResponse('Verify token not configured', { status: 500 })

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
