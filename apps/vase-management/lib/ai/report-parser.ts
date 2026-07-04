// lib/ai/report-parser.ts
// Parser de intenciones para reportes en lenguaje natural (Groq)

export interface ParsedIntent {
  entity: 'customers' | 'sales' | 'products' | 'stock' | 'invoices' | 'purchases' | 'payments'
  columns: string[]
  filters: Record<string, any>
  orderBy?: string
  orderDir?: 'asc' | 'desc'
  groupBy?: string
  dateRange?: string
  format: 'TABLE' | 'CHART'
  chartType?: 'BAR' | 'LINE' | 'PIE'
  missingInfo: string[]
  clarificationQuestions: string[]
  confidence: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const GROQ_SYSTEM_PROMPT = `Sos un experto en análisis de datos para un ERP argentino llamado Vase Business.
Tu tarea es interpretar solicitudes de reportes en lenguaje natural y convertirlas en configuraciones estructuradas.

ENTIDADES DISPONIBLES:
- customers: clientes (name, documentNumber, email, phone, creditLimit, totalDebt, creditRisk, group, zone, lastInvoiceDate)
- sales: ventas/pedidos (number, type, status, date, customerName, subtotal, ivaAmount, total, paidAmount, balance)
- products: productos (code, name, category, brand, price, cost, margin, stock, minStock, stockValue, status)
- stock: movimientos de stock (date, productCode, productName, warehouse, type, quantity, unitCost)
- invoices: facturas AFIP (letter, number, date, customerName, subtotal, ivaAmount, total, balance, cae, status)
- purchases: compras (number, date, supplierName, type, status, subtotal, total, balance)
- payments: movimientos de caja (date, type, category, description, method, amount)

RANGOS DE FECHA DISPONIBLES:
- CURRENT_MONTH, LAST_MONTH, LAST_7_DAYS, LAST_30_DAYS, CURRENT_YEAR, LAST_YEAR, CUSTOM

Respondé SIEMPRE con un JSON válido con este formato exacto:
{
  "entity": "customers|sales|products|stock|invoices|purchases|payments",
  "columns": ["col1", "col2"],
  "filters": {},
  "orderBy": "campo",
  "orderDir": "asc|desc",
  "dateRange": "CURRENT_MONTH",
  "format": "TABLE|CHART",
  "chartType": "BAR|LINE|PIE|null",
  "missingInfo": ["descripción de qué falta"],
  "clarificationQuestions": ["pregunta 1", "pregunta 2"],
  "confidence": 0.85,
  "summary": "Resumen del reporte que se generará"
}`

export async function parseReportIntent(
  userMessage: string,
  history: ConversationMessage[] = [],
  apiKey: string
): Promise<{ intent: ParsedIntent | null; reply: string; needsClarification: boolean }> {

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`)

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const intent: ParsedIntent = JSON.parse(jsonMatch[0])

    // ¿Necesita clarificación?
    const needsClarification = intent.clarificationQuestions.length > 0 && intent.confidence < 0.8

    // Construir respuesta amigable
    let reply = ''
    if (needsClarification) {
      reply = `Entendí que querés un reporte de **${translateEntity(intent.entity)}**.\n\n`
      reply += `Para generarlo necesito algunos datos más:\n\n`
      reply += intent.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    } else {
      reply = `✅ **Reporte listo para generar:**\n\n`
      reply += `📊 **Tipo:** ${translateEntity(intent.entity)}\n`
      reply += `📋 **Columnas:** ${intent.columns.join(', ')}\n`
      if (intent.dateRange) reply += `📅 **Período:** ${translateDateRange(intent.dateRange)}\n`
      if (intent.orderBy) reply += `🔀 **Ordenado por:** ${intent.orderBy} (${intent.orderDir})\n`
      reply += `\nClick en **"Generar reporte"** para ver los resultados.`
    }

    return { intent: needsClarification ? null : intent, reply, needsClarification }
  } catch (err: any) {
    console.error('[parseReportIntent]', err)
    return {
      intent: null,
      reply: 'No pude interpretar la solicitud. ¿Podés ser más específico? Por ejemplo: "Reporte de ventas del mes actual ordenado por total"',
      needsClarification: true,
    }
  }
}

function translateEntity(entity: string): string {
  const map: Record<string, string> = {
    customers: 'Clientes',
    sales: 'Ventas',
    products: 'Productos',
    stock: 'Movimientos de Stock',
    invoices: 'Facturas',
    purchases: 'Compras',
    payments: 'Movimientos de Caja',
  }
  return map[entity] ?? entity
}

function translateDateRange(range: string): string {
  const map: Record<string, string> = {
    CURRENT_MONTH: 'Mes actual',
    LAST_MONTH: 'Mes anterior',
    LAST_7_DAYS: 'Últimos 7 días',
    LAST_30_DAYS: 'Últimos 30 días',
    CURRENT_YEAR: 'Año actual',
    LAST_YEAR: 'Año anterior',
    CUSTOM: 'Personalizado',
  }
  return map[range] ?? range
}

// Preguntas de seguimiento post-reporte
export const POST_REPORT_OPTIONS = [
  { value: 'no_save', label: 'No guardar' },
  { value: 'daily', label: 'Guardar como reporte diario' },
  { value: 'weekly', label: 'Guardar como reporte semanal' },
  { value: 'monthly', label: 'Guardar como reporte mensual' },
  { value: 'custom', label: 'Guardar con frecuencia personalizada' },
]

export const DATE_RANGE_OPTIONS = [
  { value: 'CURRENT_MONTH', label: 'Mes actual' },
  { value: 'LAST_MONTH', label: 'Mes anterior' },
  { value: 'LAST_7_DAYS', label: 'Últimos 7 días' },
  { value: 'LAST_30_DAYS', label: 'Últimos 30 días' },
  { value: 'CURRENT_YEAR', label: 'Año actual' },
  { value: 'LAST_YEAR', label: 'Año anterior' },
  { value: 'CUSTOM', label: 'Rango personalizado' },
]
