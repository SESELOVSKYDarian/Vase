export type WarehouseLedColor = { r: number; g: number; b: number }

export type WarehouseLedCommandValues = {
  ledNumber: number
  activeCount: number
  color: WarehouseLedColor
  durationMs: number
}

export type WarehouseLedDeviceLimits = {
  ledCount: number
  maxActiveLeds: number
}

export function normalizeWarehouseLedCommand(values: WarehouseLedCommandValues, device: WarehouseLedDeviceLimits): WarehouseLedCommandValues {
  const isOffCommand = values.color.r === 0 && values.color.g === 0 && values.color.b === 0
  if (!Number.isInteger(values.ledNumber) || values.ledNumber < 0 || values.ledNumber >= device.ledCount) {
    throw new Error(`LED fuera de rango: ${values.ledNumber}. La tira tiene ${device.ledCount} LEDs (0-${Math.max(device.ledCount - 1, 0)}).`)
  }

  const availableFromIndex = Math.max(device.ledCount - values.ledNumber, 1)
  const maxActive = isOffCommand ? device.ledCount : Math.min(device.maxActiveLeds, availableFromIndex)
  return {
    ledNumber: values.ledNumber,
    activeCount: Math.max(0, Math.min(Math.trunc(values.activeCount), maxActive)),
    color: values.color,
    durationMs: Math.max(0, Math.trunc(values.durationMs)),
  }
}
