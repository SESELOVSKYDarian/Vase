export function selectWarehouseDeviceForCommand<T extends { active: boolean }>(devices: T[]) {
  return devices.find((device) => device.active) ?? null
}
