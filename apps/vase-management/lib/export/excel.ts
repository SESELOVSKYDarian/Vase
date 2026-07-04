// lib/export/excel.ts
// Exportador a Excel (.xlsx) con formato profesional

import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  label: string
  type: string
  width?: number
}

export interface ExportOptions {
  title?: string
  subtitle?: string
  company?: string
  columns: ExportColumn[]
  rows: Record<string, any>[]
  summary?: Record<string, any>
  filename?: string
}

const FORMAT_CURRENCY = '#,##0.00'
const FORMAT_PERCENT = '0.00%'
const FORMAT_DATE = 'DD/MM/YYYY'
const FORMAT_NUMBER = '#,##0.00'

function formatValue(value: any, type: string): any {
  if (value === null || value === undefined) return ''
  switch (type) {
    case 'currency': return typeof value === 'string' ? parseFloat(value) : value
    case 'percent': return typeof value === 'string' ? parseFloat(value) / 100 : value / 100
    case 'number': return typeof value === 'string' ? parseFloat(value) : value
    case 'date': return value ? new Date(value) : ''
    default: return String(value)
  }
}

function getCellFormat(type: string): string | undefined {
  switch (type) {
    case 'currency': return FORMAT_CURRENCY
    case 'percent': return FORMAT_PERCENT
    case 'date': return FORMAT_DATE
    case 'number': return FORMAT_NUMBER
    default: return undefined
  }
}

export function generateExcel(options: ExportOptions): Buffer {
  const wb = XLSX.utils.book_new()
  const { columns, rows, title, subtitle, company, summary } = options

  // ─── Hoja principal ───────────────────────────────────────────────
  const wsData: any[][] = []

  // Header de empresa
  if (company) wsData.push([company])
  if (title) wsData.push([title])
  if (subtitle) wsData.push([subtitle])
  wsData.push([`Generado: ${new Date().toLocaleString('es-AR')}`])
  wsData.push([]) // fila vacía

  // Header de columnas
  wsData.push(columns.map(c => c.label))

  // Datos
  for (const row of rows) {
    wsData.push(columns.map(col => formatValue(row[col.key], col.type)))
  }

  // Fila vacía antes de resumen
  if (summary && Object.keys(summary).length > 0) {
    wsData.push([])
    wsData.push(['RESUMEN'])
    for (const [key, value] of Object.entries(summary)) {
      wsData.push([key, value])
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Anchos de columna
  const headerRowIdx = company ? (subtitle ? 4 : 3) : 0
  ws['!cols'] = columns.map(col => ({ wch: col.width ?? Math.max(col.label.length, 12) }))

  // Aplicar formato a celdas de datos
  const dataStartRow = headerRowIdx + 2 // +1 para headers, +1 base-0
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < columns.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: dataStartRow + r, c })
      const fmt = getCellFormat(columns[c].type)
      if (fmt && ws[cellRef]) {
        ws[cellRef].z = fmt
      }
    }
  }

  // Merge cells para título
  const mergeEnd = Math.max(columns.length - 1, 0)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: mergeEnd } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: mergeEnd } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function generateSimpleExcel(headers: string[], data: any[][], filename = 'export'): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
