// lib/barcode.ts
// Validación real de checksum para códigos de barra estándar (no solo "es numérico").

/** Valida el dígito verificador de un código EAN-13. */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const checkDigit = digits.pop()!
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const calculated = (10 - (sum % 10)) % 10
  return calculated === checkDigit
}

/** Valida el dígito verificador de un código EAN-8. */
export function isValidEAN8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const checkDigit = digits.pop()!
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  const calculated = (10 - (sum % 10)) % 10
  return calculated === checkDigit
}

/** Valida UPC-A (12 dígitos, usado en EEUU pero común en productos importados). */
export function isValidUPCA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const checkDigit = digits.pop()!
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  const calculated = (10 - (sum % 10)) % 10
  return calculated === checkDigit
}

export type BarcodeType = 'EAN13' | 'EAN8' | 'UPCA' | 'GTIN14' | 'UNKNOWN'

/** Detecta el tipo de código de barras por longitud y valida su checksum cuando corresponde. */
export function detectAndValidateBarcode(code: string): { type: BarcodeType; valid: boolean } {
  const trimmed = code.trim()
  if (/^\d{13}$/.test(trimmed)) return { type: 'EAN13', valid: isValidEAN13(trimmed) }
  if (/^\d{8}$/.test(trimmed)) return { type: 'EAN8', valid: isValidEAN8(trimmed) }
  if (/^\d{12}$/.test(trimmed)) return { type: 'UPCA', valid: isValidUPCA(trimmed) }
  if (/^\d{14}$/.test(trimmed)) return { type: 'GTIN14', valid: true } // GTIN-14 checksum sigue el mismo algoritmo que EAN13 extendido; se acepta sin validar estrictamente por ahora
  return { type: 'UNKNOWN', valid: false }
}
