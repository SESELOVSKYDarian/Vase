// lib/warehouse/channels/whatsapp.adapter.ts
// WhatsApp Cloud API adapter: webhook verification, HMAC signature validation,
// message parsing, and reply sending via Graph API.
import crypto from 'crypto'
import { WarehouseWebhookService, type WebhookResult } from './webhook.service'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WhatsAppTextMessage {
  id: string
  from: string
  timestamp?: string
  type: 'text'
  text: { body: string }
}

interface WhatsAppMediaMessage {
  id: string
  from: string
  timestamp?: string
  type: 'audio' | 'image'
  audio?: { id: string; mime_type?: string }
  image?: { id: string; mime_type?: string; caption?: string }
}

type WhatsAppIncomingMessage = WhatsAppTextMessage | WhatsAppMediaMessage

interface WhatsAppWebhookPayload {
  object?: string
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: {
        messages?: WhatsAppIncomingMessage[]
      }
    }>
  }>
}

// ─── WhatsApp Adapter ───────────────────────────────────────────────────────

export class WhatsAppAdapter {
  /**
   * Handles GET webhook verification from Meta.
   * Meta sends hub.mode, hub.verify_token and hub.challenge.
   */
  static verifyWebhook(searchParams: URLSearchParams, expectedVerifyToken: string): WebhookResult {
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === expectedVerifyToken) {
      return { status: 200, body: challenge ?? '' }
    }

    return { status: 403, body: 'Forbidden' }
  }

  /**
   * Validates the HMAC SHA-256 signature from Meta's webhook POST.
   */
  static validateSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
    if (!signatureHeader) return false

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    const expected = `sha256=${expectedSignature}`
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  }

  /**
   * Parses the webhook payload and extracts text messages.
   */
  static extractMessages(payload: WhatsAppWebhookPayload): WhatsAppIncomingMessage[] {
    return (
      payload.entry?.flatMap(
        (entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
      ) ?? []
    )
  }

  /**
   * Sends a text reply via the WhatsApp Cloud API.
   */
  static async sendTextReply(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    body: string,
    apiVersion = 'v18.0'
  ): Promise<void> {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[WhatsApp] sendTextReply failed: ${response.status} ${text}`)
    }
  }

  /**
   * Full POST webhook handler: validates signature, extracts messages,
   * processes each through the AI pipeline, sends replies, and persists events.
   */
  static async handleWebhookPost(
    companyId: string,
    rawBody: string,
    signatureHeader: string | null
  ): Promise<WebhookResult> {
    const channel = await WarehouseWebhookService.resolveChannel(companyId, 'WHATSAPP')
    if (!channel || !channel.active) {
      return { status: 200, body: { ok: true, ignored: true } }
    }

    // Validate HMAC signature if secretToken (app secret) is configured
    if (channel.secretToken) {
      const valid = this.validateSignature(rawBody, signatureHeader, channel.secretToken)
      if (!valid) {
        return { status: 403, body: { error: 'Invalid signature' } }
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(rawBody)
    const messages = this.extractMessages(payload)

    for (const message of messages) {
      // Only handle text messages in the MVP
      if (message.type !== 'text') continue
      const textMsg = message as WhatsAppTextMessage

      // Idempotency check
      const event = await WarehouseWebhookService.persistEvent(channel.id, message.id, { from: message.from, text: textMsg.text.body })
      if (!event) continue // duplicate

      try {
        const response = await WarehouseWebhookService.processTextMessage(
          companyId,
          textMsg.text.body,
          'WHATSAPP',
          `whatsapp:${message.from}`
        )

        // Send response back via Graph API
        if (channel.providerAccountId && channel.accessToken) {
          await this.sendTextReply(
            channel.providerAccountId,
            channel.accessToken,
            message.from,
            response.text
          )
        }

        await WarehouseWebhookService.markEventDone(event.id)
      } catch (err) {
        await WarehouseWebhookService.markEventFailed(event.id, String(err))
      }
    }

    return { status: 200, body: { ok: true } }
  }
}
