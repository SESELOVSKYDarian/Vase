'use client'
// app/dashboard/pos/page.tsx

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency, cn } from '@/utils'
import { toastSuccess, toastError } from '@/components/ui/Toaster'
import { LegacyDialog } from '@/components/ui/Dialog'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Loader2,
  CreditCard, Banknote, Smartphone, X, Check, Barcode as BarcodeIcon
} from 'lucide-react'

interface CartItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  ivaRate: number
  stock: number
}

interface PaymentSplit {
  method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MERCADO_PAGO' | 'CHECK' | 'OTHER'
  amount: number
}

const PAYMENT_METHODS: { value: PaymentSplit['method']; label: string; icon: React.ReactNode }[] = [
  { value: 'CASH', label: 'Efectivo', icon: <Banknote size={15} /> },
  { value: 'CREDIT_CARD', label: 'Tarjeta Crédito', icon: <CreditCard size={15} /> },
  { value: 'DEBIT_CARD', label: 'Tarjeta Débito', icon: <CreditCard size={15} /> },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago', icon: <Smartphone size={15} /> },
  { value: 'BANK_TRANSFER', label: 'Transferencia', icon: <Banknote size={15} /> },
]

export default function PosPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPayment, setShowPayment] = useState(false)
  const [payments, setPayments] = useState<PaymentSplit[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentSplit['method']>('CASH')
  const [processing, setProcessing] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/pos/buscar?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.data ?? [])
      // Si es un match exacto de barcode con 1 solo resultado, agregar directo al carrito
      if (json.data?.length === 1 && (json.data[0].matchType === 'barcode' || json.data[0].matchType === 'alias')) {
        addToCart(json.data[0], json.data[0].quantity ?? 1)
        setQuery('')
        setResults([])
      }
    } catch { toastError('Error al buscar') }
    finally { setSearching(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250)
    return () => clearTimeout(timer)
  }, [query, search])

  function addToCart(product: any, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i)
      }
      return [...prev, {
        productId: product.id, name: product.name, quantity: qty,
        unitPrice: Number(product.price), ivaRate: Number(product.ivaRate ?? 21), stock: Number(product.stock),
      }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => prev
      .map((i) => i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter((i) => i.quantity > 0))
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const ivaTotal = cart.reduce((s, i) => s + (i.quantity * i.unitPrice) * (i.ivaRate / 100), 0)
  const total = subtotal + ivaTotal

  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = total - paymentsTotal

  function addPayment() {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setPayments((prev) => [...prev, { method: paymentMethod, amount }])
    setPaymentAmount('')
  }

  function openPaymentModal() {
    if (cart.length === 0) { toastError('El carrito está vacío'); return }
    setPayments([])
    setPaymentAmount(total.toFixed(2))
    setShowPayment(true)
  }

  async function confirmSale() {
    if (Math.abs(remaining) > 0.01) { toastError('El total pagado no coincide con el total de la venta'); return }
    setProcessing(true)
    try {
      const res = await fetch('/api/pos/venta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, ivaRate: i.ivaRate })),
          payments,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toastSuccess('Venta registrada', `${json.data.number} — ${formatCurrency(total)}`)
      setCart([])
      setPayments([])
      setShowPayment(false)
      setQuery('')
      searchRef.current?.focus()
    } catch (err: any) {
      toastError('Error al procesar venta', err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-100px)]">
      {/* Panel de búsqueda */}
      <div className="lg:col-span-3 flex flex-col min-h-0">
        <div className="relative mb-4">
          <BarcodeIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escanear código de barras o buscar producto..."
            className="w-full pl-11 pr-4 h-12 rounded-xl border border-border bg-card text-base focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            autoComplete="off"
          />
          {searching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {results.length === 0 && query.length > 0 && !searching ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sin resultados para &ldquo;{query}&rdquo;</p>
          ) : results.map((p) => (
            <button
              key={p.id}
              onClick={() => { addToCart(p, p.quantity ?? 1); setQuery(''); setResults([]); searchRef.current?.focus() }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary hover:shadow-sm transition-all text-left"
            >
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.code} {p.matchType === 'alias' && `· Paquete: ${p.quantity} unidades`} · Stock: {Number(p.stock)}
                </p>
              </div>
              <p className="font-mono font-semibold">{formatCurrency(Number(p.price))}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="lg:col-span-2 flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2"><ShoppingCart size={16} />Carrito</p>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-600 hover:underline">Vaciar</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <ShoppingCart size={32} className="text-muted-foreground/20 mb-2" />
              <p className="text-muted-foreground text-sm">Escaneá o buscá un producto</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{formatCurrency(item.unitPrice)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center"><Minus size={11} /></button>
                <span className="w-8 text-center text-sm font-mono">{item.quantity}</span>
                <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center"><Plus size={11} /></button>
              </div>
              <p className="w-20 text-right font-mono text-sm font-semibold">{formatCurrency(item.quantity * item.unitPrice * (1 + item.ivaRate / 100))}</p>
              <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-red-600"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-4 space-y-2 bg-muted/20">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>IVA</span><span className="font-mono">{formatCurrency(ivaTotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total</span><span className="font-mono">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={openPaymentModal}
            disabled={cart.length === 0}
            className="w-full mt-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check size={16} />Cobrar {formatCurrency(total)}
          </button>
        </div>
      </div>

      {/* Modal de pago */}
      <LegacyDialog open={showPayment} onOpenChange={setShowPayment} label="Cobrar venta">
          <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Cobrar {formatCurrency(total)}</h2>
              <button onClick={() => setShowPayment(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                    className={cn('flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium',
                      paymentMethod === m.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    )}>
                    {m.icon}{m.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" />
                <button onClick={addPayment} className="px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Agregar</button>
              </div>

              {payments.length > 0 && (
                <div className="space-y-1.5">
                  {payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <span>{PAYMENT_METHODS.find((m) => m.value === p.method)?.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(p.amount)}</span>
                        <button onClick={() => setPayments((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-600">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={cn('flex justify-between text-sm font-semibold p-3 rounded-lg',
                Math.abs(remaining) < 0.01 ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20'
              )}>
                <span>{remaining > 0.01 ? 'Falta' : remaining < -0.01 ? 'Sobra' : 'Completo'}</span>
                <span className="font-mono">{formatCurrency(Math.abs(remaining))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowPayment(false)} className="px-4 py-2 rounded-lg border border-border text-sm">Cancelar</button>
              <button onClick={confirmSale} disabled={Math.abs(remaining) > 0.01 || processing}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {processing && <Loader2 size={14} className="animate-spin" />}Confirmar venta
              </button>
            </div>
          </div>
      </LegacyDialog>
    </div>
  )
}
