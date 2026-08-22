export const WAREHOUSE_ONLINE_WINDOW_MS = 30_000

export function isWarehouseDeviceOnline(device: { active: boolean; status: string; lastSeenAt?: Date | string | null }, now = Date.now()) {
  if (!device.active || device.status !== 'ONLINE' || !device.lastSeenAt) return false
  return now - new Date(device.lastSeenAt).getTime() <= WAREHOUSE_ONLINE_WINDOW_MS
}

export function selectWarehouseDeviceForCommand<T extends { active: boolean; status: string; lastSeenAt?: Date | string | null }>(devices: T[], now = Date.now()) {
  return devices
    .filter((device) => isWarehouseDeviceOnline(device, now))
    .sort((a, b) => new Date(b.lastSeenAt as Date | string).getTime() - new Date(a.lastSeenAt as Date | string).getTime())[0] ?? null
}
