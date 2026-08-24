import { normalizeWarehouseLedSelection } from './warehouse-led-selection'

export type WarehouseLedColor = { r: number; g: number; b: number }

export type WarehouseLedCommandValues = {
  ledNumber: number
  ledNumbers?: number[]
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
  const ledNumbers = values.ledNumbers?.length
    ? normalizeWarehouseLedSelection(values.ledNumbers, device.ledCount, values.ledNumbers.length)
    : undefined
  if (ledNumbers && ledNumbers.length > device.maxActiveLeds) {
    throw new Error(`El dispositivo permite como máximo ${device.maxActiveLeds} LEDs activos`)
  }
  const ledNumber = ledNumbers?.[0] ?? values.ledNumber
  if (!Number.isInteger(ledNumber) || ledNumber < 0 || ledNumber >= device.ledCount) {
    throw new Error(`LED fuera de rango: ${ledNumber}. La tira tiene ${device.ledCount} LEDs (0-${Math.max(device.ledCount - 1, 0)}).`)
  }

  const availableFromIndex = Math.max(device.ledCount - ledNumber, 1)
  const maxActive = isOffCommand ? device.ledCount : Math.min(device.maxActiveLeds, availableFromIndex)
  return {
    ledNumber,
    ...(ledNumbers ? { ledNumbers } : {}),
    activeCount: ledNumbers ? ledNumbers.length : Math.max(0, Math.min(Math.trunc(values.activeCount), maxActive)),
    color: values.color,
    durationMs: Math.max(0, Math.trunc(values.durationMs)),
  }
}
