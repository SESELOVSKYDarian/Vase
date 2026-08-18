type SummaryCommand = {
  id: string
  ledNumber: number
  activeCount: number
  status: string
  createdAt: Date | string
  device: { name: string }
  productLocation: {
    product: { code: string | null; name: string }
  } | null
}

type SummaryConversation = {
  id: string
  channel: string
  messageType: string
  transcript: string | null
  intent: string | null
  createdAt: Date | string
}

export type WarehouseSummaryInput = {
  totalProducts: number
  locatedProducts: number
  productsWithLed: number
  devices: number
  onlineDevices: number
  recentCommands: SummaryCommand[]
  recentConversations: SummaryConversation[]
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}

export function serializeWarehouseSummary(input: WarehouseSummaryInput) {
  return {
    totalProducts: input.totalProducts,
    locatedProducts: input.locatedProducts,
    productsWithLed: input.productsWithLed,
    productsWithoutLed: Math.max(input.totalProducts - input.productsWithLed, 0),
    devices: input.devices,
    onlineDevices: input.onlineDevices,
    offlineDevices: Math.max(input.devices - input.onlineDevices, 0),
    recentCommands: input.recentCommands.map((command) => ({
      ...command,
      createdAt: toIsoString(command.createdAt),
    })),
    recentConversations: input.recentConversations.map((conversation) => ({
      ...conversation,
      createdAt: toIsoString(conversation.createdAt),
    })),
  }
}
