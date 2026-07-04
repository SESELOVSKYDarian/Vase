// types/index.ts
// Tipos globales para Vase Business

import type { 
  User, Company, Branch, Customer, Supplier, Product, 
  Category, Brand, Warehouse, Sale, SaleItem, Invoice, 
  InvoiceItem, Purchase, PurchaseItem, StockMovement,
  CashMovement, Role, CompanyUser, PointOfSale
} from '@prisma/client'

// =============================================
// AUTH
// =============================================

export interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  isSuperAdmin: boolean
  companyId: string | null
  companyName: string | null
  branchId: string | null
  roleId: string | null
  roleName: string | null
}

// =============================================
// RESPONSES API
// =============================================

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =============================================
// DASHBOARD
// =============================================

export interface DashboardStats {
  salesThisMonth: number
  salesLastMonth: number
  invoicesThisMonth: number
  purchasesThisMonth: number
  pendingReceivables: number
  pendingPayables: number
  cashBalance: number
  lowStockProducts: number
  activeCustomers: number
  totalProducts: number
}

export interface SalesChartData {
  date: string
  ventas: number
  facturas: number
}

export interface TopProduct {
  id: string
  name: string
  code: string
  quantity: number
  revenue: number
}

export interface TopCustomer {
  id: string
  name: string
  documentNumber: string
  totalPurchases: number
  invoiceCount: number
}

// =============================================
// CLIENTES (extendido)
// =============================================

export type CustomerWithDetails = Customer & {
  priceList?: { name: string } | null
  _count?: { sales: number }
}

export interface CustomerFormData {
  name: string
  legalName?: string
  documentType: string
  documentNumber: string
  ivaCondition: string
  priceListId?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  phone?: string
  email?: string
  creditLimit?: number
  notes?: string
}

// =============================================
// PRODUCTOS (extendido)
// =============================================

export type ProductWithDetails = Product & {
  category?: Category | null
  brand?: Brand | null
}

export interface ProductFormData {
  code: string
  barcode?: string
  name: string
  description?: string
  categoryId?: string
  brandId?: string
  unit: string
  costPrice: number
  salePrice: number
  ivaRate: number
  minStock: number
  trackStock: boolean
}

// =============================================
// VENTAS (extendido)
// =============================================

export type SaleWithDetails = Sale & {
  customer?: Customer | null
  items: (SaleItem & { product: Product })[]
  createdBy?: User | null
  pointOfSale?: PointOfSale | null
}

export interface SaleItemForm {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  ivaRate: number
  subtotal: number
  ivaAmount: number
  total: number
}

export interface SaleFormData {
  customerId?: string
  type: string
  date: string
  dueDate?: string
  notes?: string
  items: SaleItemForm[]
}

// =============================================
// FACTURAS (extendido)
// =============================================

export type InvoiceWithDetails = Invoice & {
  customer?: Customer | null
  items: InvoiceItem[]
  createdBy?: User | null
}

// =============================================
// STOCK
// =============================================

export type StockMovementWithDetails = StockMovement & {
  product: Product
  warehouse: Warehouse
}

export interface StockAdjustmentData {
  productId: string
  warehouseId: string
  quantity: number
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT'
  notes?: string
  unitCost?: number
}

// =============================================
// COMPRAS
// =============================================

export type PurchaseWithDetails = Purchase & {
  supplier: Supplier
  items: (PurchaseItem & { product: Product })[]
}

// =============================================
// TESORERÍA
// =============================================

export interface CashFlowSummary {
  totalIncome: number
  totalExpense: number
  balance: number
  byMethod: {
    method: string
    income: number
    expense: number
  }[]
}

// =============================================
// ASISTENTE IA
// =============================================

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AIQueryResponse {
  answer: string
  data?: unknown
  queryType: 'sales' | 'stock' | 'customers' | 'general'
}

// =============================================
// FACTURACIÓN AFIP
// =============================================

export interface AFIPInvoiceData {
  tipo_cbte: number
  punto_vta: number
  cbte_desde: number
  cbte_hasta: number
  fecha_cbte: string
  imp_total: number
  imp_neto: number
  imp_iva: number
  cuit_receptor?: string
  concepto: number
  iva: { id: number; BaseImp: number; Importe: number }[]
}

export interface AFIPResponse {
  success: boolean
  cae?: string
  cae_vto?: string
  error?: string
  observaciones?: string[]
}

// =============================================
// FILTROS Y PAGINACIÓN
// =============================================

export interface PaginationParams {
  page: number
  limit: number
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export interface DateRangeFilter {
  from?: Date
  to?: Date
}

// =============================================
// NAVEGACIÓN
// =============================================

export interface NavItem {
  title: string
  href: string
  icon: string
  badge?: number
  children?: NavItem[]
  roles?: string[]
}
