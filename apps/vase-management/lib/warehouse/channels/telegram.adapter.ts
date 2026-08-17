// lib/warehouse/channels/telegram.adapter.ts
// Telegram Bot API adapter: secret token verification, update parsing,
// and reply sending via Bot API.
import { WarehouseWebhookService, type WebhookResult } from './webhook.service'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
}

interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

// ─── Telegram Adapter ───────────────────────────────────────────────────────

export class TelegramAdapter {
  /**
   * Validates the X-Telegram-Bot-Api-Secret-Token header.
   * This header is set when configuring the webhook via setWebhook(..., secret_token).
   */
  static validateSecretToken(header: string | null, expectedToken: string): boolean {
    if (!header || !expectedToken) return false
    return header === expectedToken
  }

  /**
   * Sends a text reply via the Telegram Bot API.
   */
  static async sendTextReply(botToken: string, chatId: number, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`[Telegram] sendMessage failed: ${response.status} ${body}`)
    }
  }

  /**
   * Registers the webhook URL with Telegram via setWebhook.
   * Call this once when configuring the channel.
   */
  static async setWebhook(botToken: string, webhookUrl: string, secretToken?: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`
    const body: any = { url: webhookUrl }
    if (secretToken) body.secret_token = secretToken

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`[Telegram] setWebhook failed: ${response.status} ${text}`)
      return false
    }

    const result = await response.json() as { ok: boolean }
    return result.ok
  }

  /**
   * Full POST webhook handler: validates secret, extracts the text message,
   * processes through AI pipeline, sends reply, and persists the event.
   */
  static async handleWebhookPost(
    companyId: string,
    rawBody: string,
    secretTokenHeader: string | null
  ): Promise<WebhookResult> {
    const channel = await WarehouseWebhookService.resolveChannel(companyId, 'TELEGRAM')
    if (!channel || !channel.active) {
      return { status: 200, body: { ok: true, ignored: true } }
    }

    // Validate secret token if configured
    if (channel.secretToken) {
      const valid = this.validateSecretToken(secretTokenHeader, channel.secretToken)
      if (!valid) {
        return { status: 403, body: { error: 'Invalid secret token' } }
      }
    }

    const update: TelegramUpdate = JSON.parse(rawBody)
    const message = update.message

    // Only handle text messages in the MVP
    if (!message?.text || !message.from) {
      return { status: 200, body: { ok: true } }
    }

    // Skip bot commands like /start that aren't warehouse queries
    if (message.text === '/start') {
      if (channel.accessToken) {
        await this.sendTextReply(
          channel.accessToken,
          message.chat.id,
          '👋 ¡Hola! Soy el bot de depósito IA.\n\nEscribime un código de producto y te digo dónde está.\nEj: PC06\nEj: ¿Dónde está PC06?\nEj: apagar leds'
        )
      }
      return { status: 200, body: { ok: true } }
    }

    if (message.text === '/help') {
      if (channel.accessToken) {
        await this.sendTextReply(
          channel.accessToken,
          message.chat.id,
          'Podés escribirme cosas como:\n• PC06\n• ¿Dónde está PC06?\n• Buscame JS\n• apagar leds\n• asignar led 14 a PC06'
        )
      }
      return { status: 200, body: { ok: true } }
    }

    // Idempotency check using update_id as providerMessageId
    const providerMessageId = String(update.update_id)
    const event = await WarehouseWebhookService.persistEvent(channel.id, providerMessageId, {
      chatId: message.chat.id,
      from: message.from,
      text: message.text,
    })
    if (!event) {
      return { status: 200, body: { ok: true } } // duplicate
    }

    try {
      const response = await WarehouseWebhookService.processTextMessage(
        companyId,
        message.text,
        'TELEGRAM',
        `telegram:${message.from.id}`
      )

      // Send response back via Telegram Bot API
      if (channel.accessToken) {
        await this.sendTextReply(channel.accessToken, message.chat.id, response.text)
      }

      await WarehouseWebhookService.markEventDone(event.id)
    } catch (err) {
      await WarehouseWebhookService.markEventFailed(event.id, String(err))
    }

    return { status: 200, body: { ok: true } }
  }
}
