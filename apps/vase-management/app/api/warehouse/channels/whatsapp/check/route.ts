import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    const session = await auth()
    const companyId = session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const channel = await prisma.warehouseChannel.findUnique({
      where: { companyId_type: { companyId, type: 'WHATSAPP' } },
    })
    if (!channel) return NextResponse.json({ error: 'WhatsApp todavía no está configurado' }, { status: 404 })

    const credentials = Boolean(channel.providerAccountId && channel.accessToken)
    let assetVerified = false
    let subscriptionActive = false
    let displayPhoneNumber: string | null = null
    let verifiedName: string | null = null
    let graphError: string | null = null

    if (credentials) {
      const version = process.env.META_GRAPH_API_VERSION || 'v20.0'
      const base = `https://graph.facebook.com/${version}`
      const headers = { Authorization: `Bearer ${channel.accessToken}` }
      const phoneResponse = await fetch(`${base}/${encodeURIComponent(channel.providerAccountId!)}?fields=id,display_phone_number,verified_name`, { headers, cache: 'no-store' })
      const phonePayload = await phoneResponse.json().catch(() => ({}))
      assetVerified = phoneResponse.ok && phonePayload.id === channel.providerAccountId
      displayPhoneNumber = phonePayload.display_phone_number || null
      verifiedName = phonePayload.verified_name || null
      if (!phoneResponse.ok) graphError = phonePayload.error?.message || 'Meta rechazó las credenciales.'

      const subscriptionsResponse = await fetch(`${base}/${encodeURIComponent(channel.providerAccountId!)}/subscribed_apps`, { headers, cache: 'no-store' })
      const subscriptionsPayload = await subscriptionsResponse.json().catch(() => ({}))
      subscriptionActive = subscriptionsResponse.ok && Array.isArray(subscriptionsPayload.data) && subscriptionsPayload.data.length > 0
      if (!subscriptionsResponse.ok && !graphError) graphError = subscriptionsPayload.error?.message || 'No se pudo comprobar la suscripción.'
    }

    const checks = {
      webhookVerified: Boolean(channel.webhookUrl && channel.verifyToken),
      credentials,
      assetVerified,
      subscriptionActive,
    }

    return NextResponse.json({
      connected: Object.values(checks).every(Boolean),
      checks,
      displayPhoneNumber,
      verifiedName,
      graphError,
      webhookUrl: channel.webhookUrl,
      webhookKey: channel.verifyToken || process.env.META_VERIFY_TOKEN || process.env.VASE_WEBHOOK_SECRET || null,
    })
  } catch (error) {
    console.error('[Warehouse WhatsApp] connection check failed', error)
    return NextResponse.json({ error: 'No se pudo comprobar la conexión con Meta' }, { status: 500 })
  }
}
