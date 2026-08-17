import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TelegramAdapter } from '@/lib/warehouse/channels/telegram.adapter'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const channels = await prisma.warehouseChannel.findMany({
      where: { companyId: session.user.companyId },
      select: {
        id: true,
        type: true,
        providerAccountId: true,
        webhookUrl: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Do NOT expose tokens in GET responses
      },
    })

    return NextResponse.json(channels)
  } catch (error) {
    return NextResponse.json({ error: 'Error al listar canales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const companyId = session.user.companyId
    const body = await req.json()
    const { type, providerAccountId, accessToken, verifyToken, secretToken } = body

    if (!type || !['WHATSAPP', 'TELEGRAM'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de canal inválido' }, { status: 400 })
    }

    // Determine the webhook URL based on the app's base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
    const webhookUrl = type === 'WHATSAPP'
      ? `${baseUrl}/api/warehouse/channels/whatsapp/webhook`
      : `${baseUrl}/api/warehouse/channels/telegram/webhook?companyId=${companyId}`

    const channel = await prisma.warehouseChannel.upsert({
      where: { companyId_type: { companyId, type } },
      update: {
        providerAccountId,
        accessToken,
        verifyToken,
        secretToken,
        webhookUrl,
        active: true,
      },
      create: {
        companyId,
        type,
        providerAccountId,
        accessToken,
        verifyToken,
        secretToken,
        webhookUrl,
        active: true,
      },
    })

    // If Telegram, automatically register the webhook with Telegram's API
    if (type === 'TELEGRAM' && accessToken && webhookUrl) {
      const success = await TelegramAdapter.setWebhook(accessToken, webhookUrl, secretToken || undefined)
      if (!success) {
        return NextResponse.json({
          ...channel,
          warning: 'Canal guardado pero no se pudo registrar el webhook en Telegram. Verificá el token del bot.',
        })
      }
    }

    return NextResponse.json({
      id: channel.id,
      type: channel.type,
      webhookUrl: channel.webhookUrl,
      active: channel.active,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al configurar canal' }, { status: 500 })
  }
}
