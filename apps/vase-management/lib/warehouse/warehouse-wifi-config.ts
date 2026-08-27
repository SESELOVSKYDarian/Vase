export function normalizeWarehouseWifiSsid(value: string | null | undefined) {
  if (value === undefined) return undefined
  return value === '' ? null : value
}

export const WAREHOUSE_WIFI_PROFILE_KEYS = [
  ['wifiSsid', 'wifiPassword'],
  ['wifiFallbackSsid', 'wifiFallbackPassword'],
  ['wifiSecondarySsid', 'wifiSecondaryPassword'],
] as const
