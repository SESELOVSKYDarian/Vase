export type WarehouseLocation = {
  id: string
  productId?: string
  sectorId: string
  sector: { id: string; name: string }
  rack: string
  row: string
  box: string | null
  observations: string | null
  imageUrl?: string | null
  ledNumber: number | null
  ledNumbers: number[]
  active?: boolean
}

export type WarehouseProduct = {
  id: string
  code: string | null
  barcode?: string | null
  name: string
  description: string | null
  price: number | string
  isActive?: boolean
  warehouseLocations: WarehouseLocation[]
}

export type WarehouseSector = {
  id: string
  name: string
  description?: string | null
  active?: boolean
  _count?: { locations: number }
}

export type WarehouseDevice = {
  id: string
  name: string
  deviceKey: string
  type: string
  status: string
  lastSeenAt: string | null
  ledCount: number
  brightness: number
  maxActiveLeds: number
  serverBaseUrl: string | null
  wifiSsid: string | null
  hasWifiPassword: boolean
  wifiFallbackSsid: string | null
  hasWifiFallbackPassword: boolean
  wifiSecondarySsid: string | null
  hasWifiSecondaryPassword: boolean
  networkMode: 'AUTO' | 'ETHERNET' | 'WIFI'
  lastTransport: 'ETHERNET' | 'WIFI' | null
  lastIpAddress: string | null
  active: boolean
  pollingUrl: string
  completeUrlTemplate: string
  arduinoConfig: string
  createdAt?: string
  updatedAt?: string
}

export type WarehouseChannel = {
  id: string
  type: 'WHATSAPP' | 'TELEGRAM'
  providerAccountId: string | null
  wabaId: string | null
  metaAppId: string | null
  webhookKey?: string | null
  webhookUrl: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type WarehouseCommand = {
  id: string
  ledNumber: number
  activeCount: number
  status: string
  createdAt: string
  device: { name: string }
  productLocation: {
    product: { code: string | null; name: string }
  } | null
}

export type WarehouseConversation = {
  id: string
  channel: string
  messageType: string
  transcript: string | null
  intent: string | null
  createdAt: string
}

export type WarehouseSummary = {
  totalProducts: number
  locatedProducts: number
  productsWithLed: number
  productsWithoutLed: number
  devices: number
  onlineDevices: number
  offlineDevices: number
  recentCommands: WarehouseCommand[]
  recentConversations: WarehouseConversation[]
}

export type AiProposal = Record<string, unknown>

export type AiCommandResponse = {
  text: string
  intent?: string
  requiresConfirmation?: boolean
  proposal?: AiProposal
  error?: string
  [key: string]: unknown
}

export type ProductEditorValues = {
  code: string
  name: string
  description: string
  sectorName: string
  rack: string
  row: string
  box: string
  observations: string
  ledNumber: string
  ledNumbers: number[]
  ledSelectionCount: string
}
