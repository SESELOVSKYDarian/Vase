// lib/reports/executor.ts
// Motor de ejecución de reportes — interpreta configuración y consulta Prisma

import { prisma } from '@/lib/prisma'

export interface ReportResult {
  columns: { key: string; label: string; type: string }[]
  rows: Record<string, any>[]
  summary?: Record<string, any>
  chartData?: any[]
  total: number
}

// Mapa de entidades disponibles
const ENTITY_MAP: Record<string, (companyId: string, filters: any, columns?: string[], orderBy?: string, orderDir?: string) => Promise<ReportResult>> = {
  customers: executeCustomersReport,
  sales: executeSalesReport,
  products: executeProductsReport,
  stock: executeStockReport,
  invoices: executeInvoicesReport,
  purchases: executePurchasesReport,
  payments: executePaymentsReport,
}

export async function executeReport(report: any, companyId: string): Promise<ReportResult> {
  const executor = ENTITY_MAP[report.entity]
  if (!executor) throw new Error(`Entidad desconocida: ${report.entity}`)

  const filters = buildDateFilters(report)
  return executor(companyId, { ...report.filters, ...filters }, report.columns, report.orderBy, report.orderDir)
}

function buildDateFilters(report: any) {
  const now = new Date()
  switch (report.dateRange) {
    case 'CURRENT_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      }
    case 'LAST_MONTH':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      }
    case 'LAST_7_DAYS':
      return { from: new Date(Date.now() - 7 * 864e5), to: now }
    case 'LAST_30_DAYS':
      return { from: new Date(Date.now() - 30 * 864e5), to: now }
    case 'CURRENT_YEAR':
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) }
    case 'CUSTOM':
      return { from: report.dateFrom ? new Date(report.dateFrom) : undefined, to: report.dateTo ? new Date(report.dateTo) : undefined }
    default:
      return {}
  }
}

// ─── CLIENTES ───────────────────────────────────────────────────────────────

async function executeCustomersReport(companyId: string, filters: any): Promise<ReportResult> {
  const customers = await prisma.customer.findMany({
    where: {
      companyId,
      isActive: filters?.onlyActive !== false,
      ...(filters?.zoneId && { zoneId: filters.zoneId }),
      ...(filters?.groupId && { groupId: filters.groupId }),
      ...(filters?.creditRisk && { creditRisk: filters.creditRisk }),
    },
    include: {
      group: { select: { name: true } },
      zone: { select: { name: true } },
      _count: { select: { sales: true, invoices: true } },
    },
    orderBy: filters?.orderBy === 'totalDebt' ? { totalDebt: 'desc' } : { name: 'asc' },
  })

  const rows = customers.map(c => ({
    id: c.id,
    code: c.code ?? '',
    name: c.name,
    documentNumber: c.documentNumber ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    creditLimit: Number(c.creditLimit),
    totalDebt: Number(c.totalDebt),
    balance: Number(c.creditLimit) - Number(c.totalDebt),
    creditRisk: c.creditRisk,
    group: c.group?.name ?? '',
    zone: c.zone?.name ?? '',
    lastInvoiceDate: c.lastInvoiceDate?.toISOString().slice(0, 10) ?? '',
    totalSales: c._count.sales,
    totalInvoices: c._count.invoices,
  }))

  const summary = {
    totalCustomers: rows.length,
    totalDebt: rows.reduce((s, r) => s + r.totalDebt, 0),
    averageDebt: rows.length ? rows.reduce((s, r) => s + r.totalDebt, 0) / rows.length : 0,
    highRisk: rows.filter(r => r.creditRisk === 'ALTO' || r.creditRisk === 'BLOQUEADO').length,
  }

  return {
    columns: [
      { key: 'code', label: 'Código', type: 'string' },
      { key: 'name', label: 'Nombre', type: 'string' },
      { key: 'documentNumber', label: 'CUIT/DNI', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'phone', label: 'Teléfono', type: 'string' },
      { key: 'creditLimit', label: 'Límite crédito', type: 'currency' },
      { key: 'totalDebt', label: 'Deuda', type: 'currency' },
      { key: 'balance', label: 'Disponible', type: 'currency' },
      { key: 'creditRisk', label: 'Riesgo', type: 'badge' },
      { key: 'group', label: 'Grupo', type: 'string' },
      { key: 'zone', label: 'Zona', type: 'string' },
      { key: 'lastInvoiceDate', label: 'Últ. factura', type: 'date' },
      { key: 'totalSales', label: 'Pedidos', type: 'number' },
    ],
    rows,
    summary,
    total: rows.length,
  }
}

// ─── VENTAS ──────────────────────────────────────────────────────────────────

async function executeSalesReport(companyId: string, filters: any): Promise<ReportResult> {
  const where: any = {
    companyId,
    ...(filters?.from && { date: { gte: filters.from } }),
    ...(filters?.to && { date: { lte: filters.to } }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.type && { type: filters.type }),
    ...(filters?.customerId && { customerId: filters.customerId }),
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: { select: { name: true, documentNumber: true } },
      user: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  })

  const rows = sales.map(s => ({
    id: s.id,
    number: s.number ?? '',
    type: s.type,
    status: s.status,
    date: s.date.toISOString().slice(0, 10),
    customerName: s.customer?.name ?? 'Consumidor Final',
    customerDoc: s.customer?.documentNumber ?? '',
    seller: s.user?.name ?? '',
    subtotal: Number(s.subtotal),
    ivaAmount: Number(s.ivaAmount),
    total: Number(s.total),
    paidAmount: Number(s.paidAmount),
    balance: Number(s.balance),
    items: s._count.items,
  }))

  const chartData = Object.entries(
    rows.reduce((acc: Record<string, number>, r) => {
      const month = r.date.slice(0, 7)
      acc[month] = (acc[month] ?? 0) + r.total
      return acc
    }, {})
  ).map(([date, total]) => ({ date, total })).slice(-12)

  return {
    columns: [
      { key: 'number', label: 'N°', type: 'string' },
      { key: 'type', label: 'Tipo', type: 'badge' },
      { key: 'status', label: 'Estado', type: 'badge' },
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'customerName', label: 'Cliente', type: 'string' },
      { key: 'seller', label: 'Vendedor', type: 'string' },
      { key: 'subtotal', label: 'Neto', type: 'currency' },
      { key: 'ivaAmount', label: 'IVA', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'paidAmount', label: 'Cobrado', type: 'currency' },
      { key: 'balance', label: 'Saldo', type: 'currency' },
    ],
    rows,
    summary: {
      totalSales: rows.length,
      totalAmount: rows.reduce((s, r) => s + r.total, 0),
      totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
      totalBalance: rows.reduce((s, r) => s + r.balance, 0),
    },
    chartData,
    total: rows.length,
  }
}

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────

async function executeProductsReport(companyId: string, filters: any): Promise<ReportResult> {
  const products = await prisma.product.findMany({
    where: {
      companyId,
      isActive: filters?.onlyActive !== false,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.brandId && { brandId: filters.brandId }),
      ...(filters?.lowStock && { stock: { lt: prisma.product.fields.minStock } }),
    },
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      family: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  const rows = products.map(p => ({
    id: p.id,
    code: p.code ?? '',
    barcode: p.barcode ?? '',
    name: p.name,
    category: p.category?.name ?? '',
    brand: p.brand?.name ?? '',
    family: p.family?.name ?? '',
    unit: p.unit,
    price: Number(p.price),
    cost: Number(p.cost),
    margin: Number(p.cost) > 0 ? ((Number(p.price) - Number(p.cost)) / Number(p.cost) * 100).toFixed(2) : 0,
    stock: Number(p.stock),
    minStock: Number(p.minStock),
    stockValue: Number(p.stock) * Number(p.cost),
    ivaRate: Number(p.ivaRate),
    status: Number(p.stock) <= 0 ? 'SIN_STOCK' : Number(p.stock) <= Number(p.minStock) ? 'CRITICO' : 'NORMAL',
  }))

  return {
    columns: [
      { key: 'code', label: 'Código', type: 'string' },
      { key: 'name', label: 'Producto', type: 'string' },
      { key: 'category', label: 'Categoría', type: 'string' },
      { key: 'brand', label: 'Marca', type: 'string' },
      { key: 'unit', label: 'Unidad', type: 'string' },
      { key: 'price', label: 'Precio', type: 'currency' },
      { key: 'cost', label: 'Costo', type: 'currency' },
      { key: 'margin', label: 'Margen %', type: 'percent' },
      { key: 'stock', label: 'Stock', type: 'number' },
      { key: 'minStock', label: 'Stock mín.', type: 'number' },
      { key: 'stockValue', label: 'Valor stock', type: 'currency' },
      { key: 'status', label: 'Estado', type: 'badge' },
    ],
    rows,
    summary: {
      totalProducts: rows.length,
      totalStockValue: rows.reduce((s, r) => s + r.stockValue, 0),
      lowStockCount: rows.filter(r => r.status === 'CRITICO').length,
      outOfStockCount: rows.filter(r => r.status === 'SIN_STOCK').length,
    },
    total: rows.length,
  }
}

// ─── STOCK ───────────────────────────────────────────────────────────────────

async function executeStockReport(companyId: string, filters: any): Promise<ReportResult> {
  const movements = await prisma.stockMovement.findMany({
    where: {
      companyId,
      ...(filters?.from && { date: { gte: filters.from } }),
      ...(filters?.to && { date: { lte: filters.to } }),
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
      ...(filters?.type && { type: filters.type }),
    },
    include: {
      product: { select: { name: true, code: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: 1000,
  })

  const rows = movements.map(m => ({
    id: m.id,
    date: m.date.toISOString().slice(0, 10),
    productCode: m.product.code ?? '',
    productName: m.product.name,
    warehouse: m.warehouse?.name ?? 'Sin depósito',
    type: m.type,
    quantity: Number(m.quantity),
    unitCost: Number(m.unitCost ?? 0),
    totalValue: Number(m.quantity) * Number(m.unitCost ?? 0),
    reference: m.reference ?? '',
    notes: m.notes ?? '',
  }))

  return {
    columns: [
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'productCode', label: 'Código', type: 'string' },
      { key: 'productName', label: 'Producto', type: 'string' },
      { key: 'warehouse', label: 'Depósito', type: 'string' },
      { key: 'type', label: 'Tipo', type: 'badge' },
      { key: 'quantity', label: 'Cantidad', type: 'number' },
      { key: 'unitCost', label: 'Costo unit.', type: 'currency' },
      { key: 'totalValue', label: 'Valor total', type: 'currency' },
      { key: 'reference', label: 'Referencia', type: 'string' },
    ],
    rows,
    summary: {
      totalMovements: rows.length,
      totalEntries: rows.filter(r => ['ENTRY', 'PURCHASE', 'TRANSFER_IN'].includes(r.type)).length,
      totalExits: rows.filter(r => ['EXIT', 'SALE', 'TRANSFER_OUT'].includes(r.type)).length,
    },
    total: rows.length,
  }
}

// ─── FACTURAS ───────────────────────────────────────────────────────────────

async function executeInvoicesReport(companyId: string, filters: any): Promise<ReportResult> {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      ...(filters?.from && { date: { gte: filters.from } }),
      ...(filters?.to && { date: { lte: filters.to } }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.letter && { letter: filters.letter }),
      ...(filters?.customerId && { customerId: filters.customerId }),
    },
    include: {
      customer: { select: { name: true, documentNumber: true } },
      pointOfSale: { select: { number: true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  })

  const rows = invoices.map(inv => ({
    id: inv.id,
    letter: inv.letter,
    number: `${String(inv.pointOfSale?.number ?? 0).padStart(4,'0')}-${String(inv.number).padStart(8,'0')}`,
    date: inv.date.toISOString().slice(0, 10),
    dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? '',
    customerName: inv.customer?.name ?? 'Consumidor Final',
    customerDoc: inv.customer?.documentNumber ?? '',
    subtotal: Number(inv.subtotal),
    ivaAmount: Number(inv.ivaAmount),
    total: Number(inv.total),
    paidAmount: Number(inv.paidAmount),
    balance: Number(inv.balance),
    cae: inv.cae ?? '',
    status: inv.status,
  }))

  return {
    columns: [
      { key: 'letter', label: 'Letra', type: 'string' },
      { key: 'number', label: 'N° Factura', type: 'string' },
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'customerName', label: 'Cliente', type: 'string' },
      { key: 'subtotal', label: 'Neto', type: 'currency' },
      { key: 'ivaAmount', label: 'IVA', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'paidAmount', label: 'Cobrado', type: 'currency' },
      { key: 'balance', label: 'Saldo', type: 'currency' },
      { key: 'cae', label: 'CAE', type: 'string' },
      { key: 'status', label: 'Estado', type: 'badge' },
    ],
    rows,
    summary: {
      totalInvoices: rows.length,
      totalAmount: rows.reduce((s, r) => s + r.total, 0),
      totalIVA: rows.reduce((s, r) => s + r.ivaAmount, 0),
      totalPending: rows.filter(r => r.balance > 0).reduce((s, r) => s + r.balance, 0),
    },
    total: rows.length,
  }
}

// ─── COMPRAS ─────────────────────────────────────────────────────────────────

async function executePurchasesReport(companyId: string, filters: any): Promise<ReportResult> {
  const purchases = await prisma.purchase.findMany({
    where: {
      companyId,
      ...(filters?.from && { date: { gte: filters.from } }),
      ...(filters?.to && { date: { lte: filters.to } }),
      ...(filters?.supplierId && { supplierId: filters.supplierId }),
      ...(filters?.status && { status: filters.status }),
    },
    include: { supplier: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 500,
  })

  const rows = purchases.map(p => ({
    id: p.id,
    number: p.number ?? '',
    date: p.date.toISOString().slice(0, 10),
    supplierName: p.supplier.name,
    type: p.type,
    status: p.status,
    subtotal: Number(p.subtotal),
    ivaAmount: Number(p.ivaAmount),
    total: Number(p.total),
    paidAmount: Number(p.paidAmount),
    balance: Number(p.balance),
  }))

  return {
    columns: [
      { key: 'number', label: 'N° Factura', type: 'string' },
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'supplierName', label: 'Proveedor', type: 'string' },
      { key: 'type', label: 'Tipo', type: 'badge' },
      { key: 'status', label: 'Estado', type: 'badge' },
      { key: 'subtotal', label: 'Neto', type: 'currency' },
      { key: 'ivaAmount', label: 'IVA', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'paidAmount', label: 'Pagado', type: 'currency' },
      { key: 'balance', label: 'Saldo', type: 'currency' },
    ],
    rows,
    summary: {
      totalPurchases: rows.length,
      totalAmount: rows.reduce((s, r) => s + r.total, 0),
      totalPending: rows.filter(r => r.balance > 0).reduce((s, r) => s + r.balance, 0),
    },
    total: rows.length,
  }
}

async function executePaymentsReport(companyId: string, filters: any): Promise<ReportResult> {
  const movements = await prisma.cashMovement.findMany({
    where: {
      companyId,
      ...(filters?.from && { date: { gte: filters.from } }),
      ...(filters?.to && { date: { lte: filters.to } }),
      ...(filters?.type && { type: filters.type }),
    },
    orderBy: { date: 'desc' },
    take: 1000,
  })

  const rows = movements.map(m => ({
    id: m.id,
    date: m.date.toISOString().slice(0, 10),
    type: m.type,
    category: m.category ?? '',
    description: m.description,
    method: m.method,
    amount: Number(m.amount),
    reference: m.reference ?? '',
  }))

  const income = rows.filter(r => r.type === 'INCOME').reduce((s, r) => s + r.amount, 0)
  const expense = rows.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + r.amount, 0)

  return {
    columns: [
      { key: 'date', label: 'Fecha', type: 'date' },
      { key: 'type', label: 'Tipo', type: 'badge' },
      { key: 'category', label: 'Categoría', type: 'string' },
      { key: 'description', label: 'Descripción', type: 'string' },
      { key: 'method', label: 'Método', type: 'string' },
      { key: 'amount', label: 'Importe', type: 'currency' },
    ],
    rows,
    summary: { totalIncome: income, totalExpense: expense, balance: income - expense },
    total: rows.length,
  }
}
