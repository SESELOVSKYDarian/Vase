export function normalizeWarehouseLedSelection(values: number[], capacity: number, expectedCount = values.length) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('La tira LED no tiene una capacidad válida')
  if (!Number.isInteger(expectedCount) || expectedCount < 0 || expectedCount > capacity) throw new Error('La cantidad de LEDs seleccionados no es válida')

  const normalized = [...new Set(values)].sort((a, b) => a - b)
  const invalid = normalized.find((value) => !Number.isInteger(value) || value < 0 || value >= capacity)
  if (invalid !== undefined) throw new Error(`LED fuera de rango: ${invalid}. La tira admite índices 0-${capacity - 1}`)
  if (normalized.length !== expectedCount) throw new Error(`Seleccioná exactamente ${expectedCount} LED${expectedCount === 1 ? '' : 's'}`)
  return normalized
}
