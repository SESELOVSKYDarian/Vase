import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTenantContext, handleTenantError } from '@/lib/tenant'
import {
  deleteIndustrialRecord,
  getIndustrialRecord,
  listIndustrialRecords,
  saveIndustrialRecord,
  type IndustrialPayload,
} from '@/lib/industrial/store'

type RouteParams = { params: { path: string[] } }

const json = (data: unknown, status = 200) => NextResponse.json(data, { status })
const asNumber = (value: unknown) => Number(value ?? 0)
const today = () => new Date().toISOString().slice(0, 10)

function paginate(items: IndustrialPayload[], request: NextRequest) {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') ?? 15)))
  const total = items.length
  return {
    data: items.slice((page - 1) * pageSize, page * pageSize),
    count: total,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

async function readBody(request: NextRequest) {
  return request.json().catch(() => ({})) as Promise<Record<string, any>>
}

async function context() {
  const session = await auth()
  if (!session?.user) return { error: json({ error: 'Sesion requerida' }, 401) }
  try {
    const tenant = await getTenantContext(session)
    return { session, tenant }
  } catch (error) {
    return { error: handleTenantError(error) ?? json({ error: 'No autorizado' }, 401) }
  }
}

async function all(companyId: string) {
  const [clients, quotes, workOrders, deliveryNotes, invoices, payments] = await Promise.all([
    listIndustrialRecords(companyId, 'clients'),
    listIndustrialRecords(companyId, 'quotes'),
    listIndustrialRecords(companyId, 'work-orders'),
    listIndustrialRecords(companyId, 'delivery-notes'),
    listIndustrialRecords(companyId, 'invoices'),
    listIndustrialRecords(companyId, 'payments'),
  ])
  const clientById = new Map(clients.map((item) => [item.id, item]))
  return { clients, quotes, workOrders, deliveryNotes, invoices, payments, clientById }
}

function decorateOrder(order: IndustrialPayload, clientById: Map<string, IndustrialPayload>) {
  const clientId = String(order.clientId ?? order.clienteId ?? '')
  const quantity = asNumber(order.cantidadTotal)
  return {
    ...order,
    client: clientById.get(clientId) ?? null,
    items: Array.isArray(order.items) && order.items.length
      ? order.items
      : [{
          id: `${order.id}-item`,
          productoNombre: order.tipo === 'DVH' ? 'DVH' : 'Vidrio simple',
          cantidad: quantity,
          anchoMm: 1000,
          altoMm: 1000,
          m2: asNumber(order.m2Total),
        }],
    deliveries: Array.isArray(order.deliveries) ? order.deliveries : [],
  }
}

function analytics(data: Awaited<ReturnType<typeof all>>) {
  const active = data.workOrders.filter((item) => !['TERMINADA', 'ANULADA'].includes(String(item.estadoProductivo)))
  const invoiced = data.invoices.reduce((sum, item) => sum + asNumber(item.total), 0)
  const collected = data.payments.reduce((sum, item) => sum + asNumber(item.montoEquivalenteArs ?? item.importe), 0)
  const monthly = new Map<string, { month: string; label: string; presupuestado: number; facturado: number; cobrado: number }>()
  const add = (date: unknown, key: 'presupuestado' | 'facturado' | 'cobrado', amount: number) => {
    const month = String(date ?? today()).slice(0, 7)
    const row = monthly.get(month) ?? { month, label: month, presupuestado: 0, facturado: 0, cobrado: 0 }
    row[key] += amount
    monthly.set(month, row)
  }
  data.quotes.forEach((item) => add(item.fecha ?? item.createdAt, 'presupuestado', asNumber(item.total)))
  data.invoices.forEach((item) => add(item.fecha, 'facturado', asNumber(item.total)))
  data.payments.forEach((item) => add(item.fecha, 'cobrado', asNumber(item.montoEquivalenteArs ?? item.importe)))
  return {
    filters: { from: '', to: today(), tipo: 'TODOS' },
    kpis: {
      presupuestado: data.quotes.reduce((sum, item) => sum + asNumber(item.total), 0),
      facturado: invoiced,
      cobrado: collected,
      pendienteCobro: Math.max(0, invoiced - collected),
      presupuestos: data.quotes.length,
      otsActivas: active.length,
      m2EnProduccion: active.reduce((sum, item) => sum + asNumber(item.m2Total), 0),
      otAtrasadas: active.filter((item) => String(item.fechaEntrega ?? '') < today()).length,
    },
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    production: Object.entries(data.workOrders.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.estadoProductivo ?? 'PENDIENTE')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})).map(([status, count]) => ({ status, label: status.replaceAll('_', ' '), count })),
    paymentsByMethod: Object.entries(data.payments.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.metodo ?? 'OTRO')
      acc[key] = (acc[key] ?? 0) + asNumber(item.montoEquivalenteArs ?? item.importe)
      return acc
    }, {})).map(([method, amount]) => ({ method, label: method.replaceAll('_', ' '), amount })),
    categoryMix: Object.entries(data.workOrders.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.categoria ?? item.tipo ?? 'OTRO')
      acc[key] = (acc[key] ?? 0) + asNumber(item.m2Total)
      return acc
    }, {})).map(([category, m2]) => ({ category, m2 })),
    quoteStatus: Object.entries(data.quotes.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.estado ?? 'BORRADOR')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})).map(([status, count]) => ({ status, count })),
    recentQuotes: data.quotes.slice(0, 5).map((item) => ({
      ...item,
      client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
    })),
    activeWorkOrders: active.slice(0, 5),
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const current = await context()
  if ('error' in current) return current.error
  const { companyId } = current.tenant
  const path = params.path
  const root = path[0]
  const id = path[1]

  if (root === 'auth' && id === 'me') {
    return json({ user: { ...current.session.user, permissions: ['*', 'production.view_all', 'production.assign'] } })
  }
  if (root === 'profile') return json({ user: current.session.user })
  if (root === 'users' && id === 'production-workers') {
    return json([{ id: current.tenant.userId, name: current.session.user.name ?? 'Operario', role: 'PRODUCCION', active: true }])
  }
  if (root === 'users') return json([{ ...current.session.user, active: true, role: 'ADMIN', userRoles: [] }])
  if (root === 'roles') return json([])
  if (root === 'permissions') return json({ data: [] })

  const data = await all(companyId)
  if (root === 'analytics') return json({ data: analytics(data) })
  if (root === 'dashboard' && id === 'production') {
    const active = data.workOrders.filter((item) => !['TERMINADA', 'ANULADA'].includes(String(item.estadoProductivo)))
    const card = (item: IndustrialPayload) => ({
      id: item.id,
      numero: item.numero,
      client: data.clientById.get(String(item.clientId ?? item.clienteId ?? ''))?.razonSocial ?? 'Cliente',
      sector: item.tipo === 'DVH' ? 'Corte · Armado' : 'Corte',
      fechaEntrega: item.fechaEntrega,
      estado: item.estadoProductivo,
      total: item.cantidadTotal,
      completed: Math.round(asNumber(item.cantidadTotal) * asNumber(item.porcentajeAvance) / 100),
    })
    return json({ data: {
      summary: {
        pending: active.filter((item) => item.estadoProductivo === 'PENDIENTE').length,
        overdue: active.filter((item) => String(item.fechaEntrega ?? '') < today()).length,
        completed: data.workOrders.filter((item) => item.estadoProductivo === 'TERMINADA').length,
        newThisWeek: active.length,
      },
      upcoming: active.slice(0, 8).map(card),
      newAssignments: active.slice(0, 8).map(card),
    } })
  }

  if (root === 'clients' && id && path[2] === 'history') {
    const client = await getIndustrialRecord(companyId, 'clients', id)
    if (!client) return json({ error: 'Cliente no encontrado' }, 404)
    return json({ data: {
      client,
      quotes: data.quotes.filter((item) => (item.clientId ?? item.clienteId) === id),
      workOrders: data.workOrders.filter((item) => (item.clientId ?? item.clienteId) === id),
      invoices: data.invoices.filter((item) => (item.clientId ?? item.clienteId) === id),
      payments: data.payments.filter((item) => (item.clientId ?? item.clienteId) === id),
      accountMovements: (await listIndustrialRecords(companyId, 'account-movements')).filter((item) => item.clienteId === id),
    } })
  }

  if (root === 'work-orders' && id && path[2] === 'progress') {
    const order = await getIndustrialRecord(companyId, 'work-orders', id)
    if (!order) return json({ error: 'Orden no encontrada' }, 404)
    return json({ data: { order: decorateOrder(order, data.clientById), progress: [] } })
  }

  if (id && !['history', 'status', 'assignments', 'progress'].includes(id)) {
    const entity = root
    const item = await getIndustrialRecord(companyId, entity, id)
    if (!item) return json({ error: 'Registro no encontrado' }, 404)
    if (entity === 'quotes') {
      return json({ data: {
        ...item,
        client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
        items: Array.isArray(item.items) ? item.items : [],
        workOrder: data.workOrders.find((order) => order.quoteId === item.id) ?? null,
        invoices: data.invoices.filter((invoice) => invoice.quoteId === item.id),
      } })
    }
    if (entity === 'work-orders') return json({ data: decorateOrder(item, data.clientById) })
    if (entity === 'delivery-notes') {
      return json({ data: {
        ...item,
        client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
        workOrder: data.workOrders.find((order) => order.id === item.workOrderId) ?? null,
        items: (item.items as any[] ?? []).map((entry, index) => ({
          id: entry.id ?? `${item.id}-${index}`,
          productoNombre: entry.productoNombre ?? entry.producto ?? 'Producto',
          cantidadEntregada: entry.cantidadEntregada ?? entry.cantidad ?? 0,
        })),
      } })
    }
    if (entity === 'invoices') {
      return json({ data: {
        ...item,
        client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
        items: Array.isArray(item.items) ? item.items : [],
      } })
    }
    return json({ data: item })
  }

  if (root === 'company-settings') {
    const stored = await getIndustrialRecord(companyId, 'company-settings', 'default')
    return json({ data: {
      razonSocial: current.session.user.companyName ?? 'Empresa',
      nombreFantasia: current.session.user.companyName ?? 'Empresa',
      cuit: '',
      domicilioComercial: '',
      condicionIva: 'RESPONSABLE_INSCRIPTO',
      puntoVenta: 1,
      logoData: '',
      ...(stored ?? {}),
    } })
  }
  if (root === 'arca') {
    if (id === 'parameters') return json({ data: [] })
    if (id === 'credentials') return json({ data: [] })
    if (id === 'health') return json({ data: { status: 'NOT_CONFIGURED', checks: [] } })
    return json({ data: { configured: false, environment: 'homologacion' } })
  }
  if (root === 'audit') return json({ data: [], count: 0 })
  if (root === 'categories') return json({ data: [
    { id: 'simple', nombre: 'SIMPLE', activa: true },
    { id: 'dvh', nombre: 'DVH', activa: true },
    { id: 'templado', nombre: 'TEMPLADO', activa: true },
  ] })

  let items = await listIndustrialRecords(companyId, root)
  items = items.filter((item) => !item.deleted && item.estado !== 'ANULADO')
  const status = request.nextUrl.searchParams.get('status')
  const type = request.nextUrl.searchParams.get('type')
  const clientId = request.nextUrl.searchParams.get('clientId')
  if (status) items = items.filter((item) => item.estado === status)
  if (type) items = items.filter((item) => item.tipo === type)
  if (clientId) items = items.filter((item) => (item.clientId ?? item.clienteId) === clientId)
  if (root === 'quotes') items = items.map((item) => ({
    ...item,
    client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
    workOrder: data.workOrders.find((order) => order.quoteId === item.id) ?? null,
    invoices: data.invoices.filter((invoice) => invoice.quoteId === item.id),
  }))
  if (root === 'work-orders') items = items.map((item) => decorateOrder(item, data.clientById))
  if (root === 'delivery-notes' || root === 'invoices') items = items.map((item) => ({
    ...item,
    client: data.clientById.get(String(item.clientId ?? item.clienteId ?? '')) ?? null,
  }))
  if (root === 'payments' && id === 'history') return json(paginate(items, request))
  return json(paginate(items, request))
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const current = await context()
  if ('error' in current) return current.error
  const { companyId, userId } = current.tenant
  const [root, id, action] = params.path
  const body = await readBody(request)

  if (root === 'profile') return json({ success: true })
  if (root === 'arca') return json({ error: 'Configura ARCA desde la integracion fiscal principal de Vase Management.' }, 409)
  if (root === 'audit') return json({ error: 'La restauracion de auditoria requiere datos persistidos.' }, 409)

  if (root === 'quotes' && id && (action === 'decision' || action === 'send')) {
    const quote = await getIndustrialRecord(companyId, 'quotes', id)
    if (!quote) return json({ error: 'Presupuesto no encontrado' }, 404)
    const approved = action === 'decision' && body.action === 'approve'
    const updated = {
      ...quote,
      estado: action === 'send' ? 'ENVIADO' : approved ? 'APROBADO' : 'RECHAZADO',
      motivoRechazo: body.motivo ?? null,
      updatedAt: new Date().toISOString(),
    } as IndustrialPayload
    await saveIndustrialRecord(companyId, 'quotes', updated)
    let workOrder: IndustrialPayload | null = null
    if (approved) {
      workOrder = {
        id: randomUUID(),
        numero: `OT-${Date.now().toString().slice(-6)}`,
        quoteId: id,
        clientId: quote.clientId ?? quote.clienteId,
        obra: quote.obra ?? '',
        tipo: quote.tipo ?? 'SIMPLE',
        categoria: quote.tipo ?? 'SIMPLE',
        fechaCreacion: today(),
        fechaEntrega: quote.fechaEntrega ?? today(),
        prioridad: 'MEDIA',
        porcentajeAvance: 0,
        estadoProductivo: 'PENDIENTE',
        estadoEntrega: 'SIN_ENTREGAR',
        estadoFacturacion: 'SIN_FACTURAR',
        cantidadTotal: quote.cantidadTotal ?? 0,
        m2Total: quote.m2Total ?? 0,
        cantidadEntregada: 0,
        items: quote.items ?? [],
      }
      await saveIndustrialRecord(companyId, 'work-orders', workOrder)
    }
    return json({ data: { quote: updated, workOrder } })
  }

  if (root === 'delivery-notes' && id && (action === 'confirm' || action === 'cancel')) {
    const note = await getIndustrialRecord(companyId, root, id)
    if (!note) return json({ error: 'Remito no encontrado' }, 404)
    const updated = { ...note, estado: action === 'confirm' ? 'CONFIRMADO' : 'ANULADO' } as IndustrialPayload
    await saveIndustrialRecord(companyId, root, updated)
    return json({ data: updated })
  }

  if (root === 'work-orders' && id && action === 'progress') {
    const order = await getIndustrialRecord(companyId, root, id)
    if (!order) return json({ error: 'Orden no encontrada' }, 404)
    const nextProgress = Math.min(100, asNumber(order.porcentajeAvance) + Math.max(1, asNumber(body.quantity)))
    const updated = {
      ...order,
      porcentajeAvance: nextProgress,
      estadoProductivo: nextProgress >= 100 ? 'TERMINADA' : 'EN_PROCESO',
    } as IndustrialPayload
    await saveIndustrialRecord(companyId, root, updated)
    return json({ data: {
      estadoProductivo: updated.estadoProductivo,
      porcentajeAvance: nextProgress,
      sectorCompleted: nextProgress >= 100,
      entry: { id: randomUUID(), task: body.task, quantity: body.quantity, note: body.note, userId },
    } })
  }

  if (root === 'invoices' && id && action === 'emit') {
    const invoice = await getIndustrialRecord(companyId, root, id)
    if (!invoice) return json({ error: 'Factura no encontrada' }, 404)
    const emitted = {
      ...invoice,
      estadoArca: invoice.tipoFacturacion === 'N' ? 'NO_APLICA' : 'AUTORIZADA',
      cae: invoice.tipoFacturacion === 'N' ? null : String(Date.now()).padEnd(14, '0').slice(0, 14),
      vencimientoCae: invoice.tipoFacturacion === 'N'
        ? null
        : new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    } as IndustrialPayload
    await saveIndustrialRecord(companyId, root, emitted)
    return json({ data: emitted })
  }

  if (root === 'invoices' && id && action === 'adjustments') {
    const original = await getIndustrialRecord(companyId, root, id)
    if (!original) return json({ error: 'Factura no encontrada' }, 404)
    const adjustment: IndustrialPayload = {
      ...original,
      id: randomUUID(),
      numero: `AJ-${Date.now().toString().slice(-6)}`,
      documentType: body.kind,
      estadoArca: body.mode === 'EMITIR' ? 'AUTORIZADA' : 'PENDIENTE',
      items: body.items ?? [],
      observaciones: body.reasonDescription ?? body.reason ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await saveIndustrialRecord(companyId, root, adjustment)
    return json({ data: adjustment }, 201)
  }

  const entity = root
  const record: IndustrialPayload = {
    ...body,
    id: String(body.id ?? randomUUID()),
    createdAt: body.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (entity === 'clients') {
    record.codigoCliente = body.codigoCliente ?? `CLI-${Date.now().toString().slice(-5)}`
    record.estado = body.estado ?? 'ACTIVO'
  }
  if (entity === 'quotes') {
    record.numero = body.numero ?? `P-${Date.now().toString().slice(-6)}`
    record.clientId = body.clientId ?? body.clienteId
    record.fecha = body.fecha ?? today()
    record.tipoFacturacion = body.tipoFacturacion ?? 'A'
    record.cantidadTotal = body.totals?.cantidad ?? body.cantidadTotal ?? 0
    record.m2Total = body.totals?.m2 ?? body.m2Total ?? 0
    record.subtotalBruto = body.totals?.subtotalBruto ?? 0
    record.montoBonificacion = body.totals?.bonificacion ?? 0
    record.subtotalNeto = body.totals?.subtotalNeto ?? 0
    record.iva = body.totals?.iva ?? 0
    record.total = body.totals?.total ?? 0
  }
  if (entity === 'delivery-notes') {
    record.numero = body.numero ?? `R-${Date.now().toString().slice(-6)}`
    record.fecha = body.fecha ?? today()
    record.estado = 'BORRADOR'
  }
  if (entity === 'payments') {
    record.numero = body.numero ?? `REC-${Date.now().toString().slice(-6)}`
    record.fecha = body.fecha ?? today()
  }
  await saveIndustrialRecord(companyId, entity, record)
  return json({ data: record }, 201)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const current = await context()
  if ('error' in current) return current.error
  const [root, id, action] = params.path
  const body = await readBody(request)
  const recordId = id ?? body.id
  if (!recordId) return json({ error: 'Falta id' }, 400)
  const currentRecord = await getIndustrialRecord(current.tenant.companyId, root, String(recordId))
  if (!currentRecord) return json({ error: 'Registro no encontrado' }, 404)
  const updated = {
    ...currentRecord,
    ...body,
    id: String(recordId),
    updatedAt: new Date().toISOString(),
  } as IndustrialPayload
  if (root === 'work-orders' && action === 'status') updated.estadoProductivo = body.estado
  await saveIndustrialRecord(current.tenant.companyId, root, updated)
  return json({ data: updated })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const current = await context()
  if ('error' in current) return current.error
  const [root, id] = params.path
  const body = await readBody(request)
  const recordId = id ?? body.id ?? request.nextUrl.searchParams.get('id')
  if (!recordId) return json({ error: 'Falta id' }, 400)
  const removed = await deleteIndustrialRecord(current.tenant.companyId, root, String(recordId))
  return removed ? json({ success: true }) : json({ error: 'Registro no encontrado' }, 404)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const current = await context()
  if ('error' in current) return current.error
  const [root] = params.path
  const body = await readBody(request)
  if (root !== 'company-settings') return json({ error: 'Metodo no soportado' }, 405)
  const record = {
    ...body,
    id: 'default',
    updatedAt: new Date().toISOString(),
  } as IndustrialPayload
  await saveIndustrialRecord(current.tenant.companyId, root, record)
  return json({ data: record })
}
