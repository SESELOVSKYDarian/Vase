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

const DEFAULT_WAREHOUSE_LED_COLOR: WarehouseLedColor = { r: 0, g: 80, b: 20 }

function normalizeColorComponent(value: number) {
  return Math.max(0, Math.min(255, Math.trunc(value)))
}

export function normalizeWarehouseLedColor(color: WarehouseLedColor | null | undefined): WarehouseLedColor {
  if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
    return { ...DEFAULT_WAREHOUSE_LED_COLOR }
  }
  return {
    r: normalizeColorComponent(color.r),
    g: normalizeColorComponent(color.g),
    b: normalizeColorComponent(color.b),
  }
}

export function normalizeWarehouseLedCommand(values: WarehouseLedCommandValues, device: WarehouseLedDeviceLimits): WarehouseLedCommandValues {
  const color = normalizeWarehouseLedColor(values.color)
  const isOffCommand = color.r === 0 && color.g === 0 && color.b === 0
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
    color,
    durationMs: Math.max(0, Math.trunc(values.durationMs)),
  }
}
