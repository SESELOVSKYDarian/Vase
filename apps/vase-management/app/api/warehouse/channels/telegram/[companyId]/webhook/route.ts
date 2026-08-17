import { NextRequest, NextResponse } from 'next/server'
import { TelegramAdapter } from '@/lib/warehouse/channels/telegram.adapter'

export const dynamic = 'force-dynamic'

// POST: Inbound Telegram updates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const rawBody = await request.text()
  const secretTokenHeader = request.headers.get('x-telegram-bot-api-secret-token')

  const result = await TelegramAdapter.handleWebhookPost(companyId, rawBody, secretTokenHeader)
  return NextResponse.json(result.body, { status: result.status })
}
