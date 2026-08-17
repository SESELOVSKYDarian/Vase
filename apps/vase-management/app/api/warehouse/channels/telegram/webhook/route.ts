import { NextRequest, NextResponse } from 'next/server'
import { TelegramAdapter } from '@/lib/warehouse/channels/telegram.adapter'

export const dynamic = 'force-dynamic'

// POST: Centralized inbound Telegram updates (companyId is passed as query param)
export async function POST(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId parameter' }, { status: 400 })
  }

  const rawBody = await request.text()
  const secretTokenHeader = request.headers.get('x-telegram-bot-api-secret-token')

  const result = await TelegramAdapter.handleWebhookPost(companyId, rawBody, secretTokenHeader)
  return NextResponse.json(result.body, { status: result.status })
}
