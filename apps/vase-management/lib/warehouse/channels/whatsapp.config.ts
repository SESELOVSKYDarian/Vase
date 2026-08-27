export function resolveWhatsAppVerifyToken(channelToken: string | null | undefined, fallbackToken: string | null | undefined) {
  return channelToken?.trim() || fallbackToken?.trim() || null
}
