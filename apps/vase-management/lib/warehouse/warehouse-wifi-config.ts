export function normalizeWarehouseWifiSsid(value: string | null | undefined) {
  if (value === undefined) return undefined
  return value === '' ? null : value
}
