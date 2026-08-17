// lib/warehouse/channels/webhook.service.ts
// Base webhook service: resolves channel config, persists events, orchestrates processing.
import { prisma } from '@/lib/prisma'
import { WarehouseChannelService } from '../warehouse-channel.service'
import type { WarehouseConversationChannel } from '@prisma/client'

export type WebhookResult = {
  status: number
  body: any
}

export class WarehouseWebhookService {
  /**
   * Resolves WarehouseChannel config for a given companyId + channelType.
   * Returns null if no active channel is configured.
   */
  static async resolveChannel(companyId: string, channelType: WarehouseConversationChannel) {
    return prisma.warehouseChannel.findUnique({
      where: { companyId_type: { companyId, type: channelType } },
    })
  }

  /**
   * Persists an inbound webhook event for idempotency and audit.
   * Returns null if the event was already processed (duplicate providerMessageId).
   */
  static async persistEvent(channelId: string, providerMessageId: string | null, payload: any) {
    if (providerMessageId) {
      const existing = await prisma.warehouseWebhookEvent.findUnique({
        where: { channelId_providerMessageId: { channelId, providerMessageId } },
      })
      if (existing) return null // already processed
    }

    return prisma.warehouseWebhookEvent.create({
      data: {
        channelId,
        providerMessageId,
        status: 'PROCESSING',
        payload,
      },
    })
  }

  /**
   * Marks a webhook event as done.
   */
  static async markEventDone(eventId: string) {
    await prisma.warehouseWebhookEvent.update({
      where: { id: eventId },
      data: { status: 'DONE' },
    })
  }

  /**
   * Marks a webhook event as failed.
   */
  static async markEventFailed(eventId: string, error: string) {
    await prisma.warehouseWebhookEvent.update({
      where: { id: eventId },
      data: { status: 'FAILED', error },
    })
  }

  /**
   * Processes an inbound text message through the AI pipeline and returns
   * the ChannelResponse. Also logs to WarehouseConversationLog.
   */
  static async processTextMessage(companyId: string, text: string, channel: WarehouseConversationChannel, externalUserId: string) {
    const response = await WarehouseChannelService.processCommand(companyId, text)

    // Log the conversation
    await prisma.warehouseConversationLog.create({
      data: {
        companyId,
        channel,
        externalUserId,
        messageType: 'TEXT',
        transcript: text,
        intent: response.text,
        payload: response.proposal ?? undefined,
      },
    })

    return response
  }
}
