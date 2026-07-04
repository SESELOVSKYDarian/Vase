// services/afip.service.ts
// Servicio AFIP/ARCA — Arquitectura lista para integración con WSFE
// Actualmente usa mock. Reemplazar implementación de AFIPService con llamadas reales.

export interface AFIPInvoiceRequest {
  cuit: string
  puntoVenta: number
  tipoComprobante: number // 1=FA, 6=FB, 11=FC, 19=FM, 51=FE
  numero: number
  fecha: string // YYYYMMDD
  importeTotal: number
  importeNeto: number
  importeIVA: number
  importeExento?: number
  cuitReceptor?: string
  tipoDocReceptor?: number // 80=CUIT, 96=DNI
  concepto?: number // 1=Productos, 2=Servicios, 3=Ambos
  items?: AFIPItem[]
}

export interface AFIPItem {
  descripcion: string
  cantidad: number
  precioUnitario: number
  alicuotaIVA: number // 0,5,10.5,21,27
  importeIVA: number
  importeTotal: number
}

export interface AFIPResponse {
  success: boolean
  cae?: string
  caeFechaVto?: string
  numeroComprobante?: number
  observaciones?: string[]
  errores?: string[]
  qrData?: string
}

// Alícuotas IVA según AFIP
export const ALICUOTAS_IVA = {
  0: { id: 3, descripcion: 'Exento' },
  2.5: { id: 9, descripcion: '2.5%' },
  5: { id: 8, descripcion: '5%' },
  10.5: { id: 4, descripcion: '10.5%' },
  21: { id: 5, descripcion: '21%' },
  27: { id: 6, descripcion: '27%' },
} as const

// Tipos de comprobante AFIP
export const TIPOS_COMPROBANTE = {
  'FA': 1, 'NDA': 2, 'NCA': 3,
  'FB': 6, 'NDB': 7, 'NCB': 8,
  'FC': 11, 'NDC': 12, 'NCC': 13,
  'FM': 51, 'FE': 19,
} as const

// =====================================================
// IMPLEMENTACIÓN MOCK (desarrollo y demo)
// =====================================================
class MockAFIPService {
  constructor() {
    // GUARDA CRÍTICA: este mock NUNCA puede correr en producción.
    // lib/env.ts ya bloquea el arranque del proceso si AFIP_ENV=production
    // sin credenciales reales, pero esta verificación adicional protege
    // contra el caso de que alguien instancie el mock a mano en código nuevo.
    if (process.env.NODE_ENV === 'production' && process.env.AFIP_ENV === 'production') {
      throw new Error(
        '🚫 MockAFIPService no puede instanciarse en producción con AFIP_ENV=production. ' +
        'Esto evitaría que el sistema emita CAE falsos como si fueran fiscales reales. ' +
        'Implementá RealAFIPService (WSAA/WSFEv1) o dejá AFIP_ENV=sandbox.'
      )
    }
  }

  async authorize(request: AFIPInvoiceRequest): Promise<AFIPResponse> {
    // Simular latencia de red AFIP
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200))

    // Simular error ocasional (5% probabilidad)
    if (Math.random() < 0.05) {
      return {
        success: false,
        errores: ['Error de conectividad con ARCA (simulado)'],
        observaciones: ['El servicio WSFE no está disponible temporalmente'],
      }
    }

    // Generar CAE mock (14 dígitos numéricos)
    const cae = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')

    // Vencimiento CAE: 10 días hábiles
    const vto = new Date()
    vto.setDate(vto.getDate() + 10)
    const caeFechaVto = vto.toISOString().slice(0, 10).replace(/-/g, '')

    // Generar datos QR AFIP
    const qrPayload = {
      ver: 1,
      fecha: request.fecha.slice(0, 4) + '-' + request.fecha.slice(4, 6) + '-' + request.fecha.slice(6, 8),
      cuit: parseInt(request.cuit.replace(/-/g, '')),
      ptoVta: request.puntoVenta,
      tipoCmp: request.tipoComprobante,
      nroCmp: request.numero,
      importe: request.importeTotal,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: request.tipoDocReceptor ?? 99,
      nroDocRec: parseInt(request.cuitReceptor?.replace(/-/g, '') ?? '0'),
      tipoCodAut: 'E',
      codAut: parseInt(cae),
    }

    const qrBase64 = Buffer.from(JSON.stringify(qrPayload)).toString('base64')

    return {
      success: true,
      cae,
      caeFechaVto,
      numeroComprobante: request.numero,
      observaciones: [
        '⚠️ MODO DEMO: CAE generado localmente.',
        'Integrar con ARCA WSFE para producción.',
        `Endpoint: https://serviciosweb.afip.gob.ar/wsfev1/service.asmx`,
      ],
      qrData: `https://www.afip.gob.ar/fe/qr/?p=${qrBase64}`,
    }
  }

  async getLastNumber(puntoVenta: number, tipoComprobante: number): Promise<number> {
    await new Promise((r) => setTimeout(r, 80))
    return Math.floor(Math.random() * 100)
  }

  async checkServerStatus(): Promise<boolean> {
    return true
  }
}

// =====================================================
// WSMTXCA (facturación con detalle de ítems) y WSFEX (exportación)
// =====================================================
//
// AFIP expone servicios distintos según el caso de uso:
//   - WSFEv1: facturación estándar (lo que implementa MockAFIPService arriba)
//   - WSMTXCA: igual que WSFEv1 pero con el detalle de ítems tipificado
//     (código de producto AFIP, unidad de medida normalizada) — lo pide
//     un subconjunto de rubros (ej: combustibles)
//   - WSFEX: facturación de exportación (factura tipo E), con divisa
//     extranjera e Incoterms
//
// NINGUNO de los dos está implementado — ni siquiera como mock. La razón:
// simularlos sin haber visto la estructura real de request/response de
// cada uno (que solo se puede obtener con acceso al WSDL de AFIP y
// credenciales de homologación) generaría una interfaz que probablemente
// no coincida con la real, dando una falsa sensación de "ya está" cuando
// haya que conectar credenciales reales. Se deja solo la interfaz de
// entrada esperada, para que implementarlos sea completar el cuerpo de
// la función, no rediseñar la superficie que ya usa facturacion/route.ts.

export interface WSMTXCAItemRequest extends AFIPItem {
  codigoProductoAfip?: string // catálogo de códigos de producto que exige AFIP para este servicio
  unidadMedidaAfip: number    // código de unidad de medida normalizado AFIP (ej: 7=litro)
}

export interface WSFEXInvoiceRequest extends Omit<AFIPInvoiceRequest, 'importeIVA'> {
  monedaId: string      // 'DOL', 'EUR', etc. — WSFEX no es necesariamente en pesos
  cotizacion: number     // tipo de cambio al momento de la operación
  incoterm?: string      // FOB, CIF, etc.
  paisDestino: number     // código de país AFIP
}

/**
 * NO IMPLEMENTADO. Lanza siempre — existe para que el caller falle explícito
 * en vez de silenciosamente usar WSFEv1 para un caso que necesita WSMTXCA.
 */
export async function authorizeWSMTXCA(_request: { items: WSMTXCAItemRequest[] } & AFIPInvoiceRequest): Promise<AFIPResponse> {
  throw new Error('WSMTXCA no está implementado todavía. Requiere acceso al WSDL real de AFIP para mapear correctamente los códigos de producto y unidad de medida.')
}

/**
 * NO IMPLEMENTADO. Lanza siempre — ver nota de WSMTXCA arriba, aplica igual acá.
 */
export async function authorizeWSFEX(_request: WSFEXInvoiceRequest): Promise<AFIPResponse> {
  throw new Error('WSFEX no está implementado todavía. Requiere acceso al WSDL real de AFIP para facturación de exportación.')
}

// =====================================================
// IMPLEMENTACIÓN REAL (producción con ARCA/WSFE)
// Descomentar y configurar cuando estés listo para producción
// =====================================================
/*
class RealAFIPService {
  private cert: string
  private key: string
  private cuit: string
  private env: 'sandbox' | 'production'

  constructor() {
    this.cert = process.env.AFIP_CERT ?? ''
    this.key = process.env.AFIP_KEY ?? ''
    this.cuit = process.env.AFIP_CUIT ?? ''
    this.env = (process.env.AFIP_ENV ?? 'sandbox') as 'sandbox' | 'production'
  }

  private get wsfeEndpoint() {
    return this.env === 'production'
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
  }

  // Para implementar: usar librería afip-node o axios + soap
  async authorize(request: AFIPInvoiceRequest): Promise<AFIPResponse> {
    // 1. Obtener Token de Acceso (TA) via WSAA
    // 2. Construir XML de solicitud según especificación AFIP
    // 3. Enviar a FECAESolicitar
    // 4. Procesar respuesta y extraer CAE
    throw new Error('Implementar integración WSFE real')
  }
}
*/

// Exportar instancia según entorno
// Factory: decide qué implementación instanciar según el entorno.
// Si en algún momento se implementa RealAFIPService, este es el único
// lugar que hay que tocar para activarlo.
function createAfipService() {
  const isProdFiscal = process.env.NODE_ENV === 'production' && process.env.AFIP_ENV === 'production'

  if (isProdFiscal) {
    // RealAFIPService todavía no está implementado (requiere WSAA real,
    // manejo de certificados .crt/.key y parsing SOAP de WSFEv1). Hasta que
    // exista, NO se levanta el servicio en este modo — ver lib/env.ts, que
    // ya bloquea el arranque del proceso completo antes de llegar acá.
    throw new Error(
      'RealAFIPService no está implementado todavía. AFIP_ENV=production requiere ' +
      'completar la integración WSAA/WSFEv1 real antes de habilitar facturación fiscal en producción.'
    )
  }

  return new MockAFIPService()
}

export const afipService = createAfipService()

// Helper para obtener tipo de comprobante según letra
export function getTipoComprobante(letra: 'A' | 'B' | 'C' | 'M' | 'E'): number {
  const map: Record<string, number> = { A: 1, B: 6, C: 11, M: 51, E: 19 }
  return map[letra] ?? 6
}

// Helper para obtener tipo de documento receptor
export function getTipoDocReceptor(condition: string): number {
  if (condition === 'RESPONSABLE_INSCRIPTO') return 80 // CUIT
  if (condition === 'MONOTRIBUTISTA') return 80 // CUIT
  if (condition === 'DNI') return 96 // DNI
  return 99 // Consumidor final
}
