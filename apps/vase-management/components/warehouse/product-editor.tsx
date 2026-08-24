'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Box, ChevronRight, Lightbulb, LoaderCircle, MapPin, Package, Save, X } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { getErrorMessage, warehouseRequest } from './client'
import { LedStripCanvas } from './led-strip-canvas'
import type { ProductEditorValues, WarehouseProduct } from './types'

type LedMapResponse = {
  device: { id: string; name: string; ledCount: number; maxActiveLeds: number; status: string } | null
  assignments: Array<{ productId: string; productCode: string | null; productName: string; ledNumbers: number[] }>
}

const emptyValues: ProductEditorValues = { code: '', name: '', description: '', sectorName: '', rack: '', row: '', box: '', observations: '', ledNumber: '', ledNumbers: [], ledSelectionCount: '4' }

function valuesFromProduct(product: WarehouseProduct | null): ProductEditorValues {
  if (!product) return { ...emptyValues }
  const location = product.warehouseLocations[0]
  const ledNumbers = location?.ledNumbers?.length ? location.ledNumbers : location?.ledNumber == null ? [] : [location.ledNumber]
  return { code: product.code || '', name: product.name, description: product.description || '', sectorName: location?.sector.name || '', rack: location?.rack || '', row: location?.row || '', box: location?.box || '', observations: location?.observations || '', ledNumber: ledNumbers[0] == null ? '' : String(ledNumbers[0]), ledNumbers, ledSelectionCount: String(ledNumbers.length || 4) }
}

export function ProductEditor({ open, product, onClose, onSaved }: { open: boolean; product: WarehouseProduct | null; onClose: () => void; onSaved: (message: string, tone?: 'success' | 'warning') => void }) {
  const [values, setValues] = useState<ProductEditorValues>({ ...emptyValues })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ledMap, setLedMap] = useState<LedMapResponse>({ device: null, assignments: [] })
  const [loadingLedMap, setLoadingLedMap] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(valuesFromProduct(product)); setError(null); setLoadingLedMap(true)
    void warehouseRequest<LedMapResponse>('/api/warehouse/led-map').then(setLedMap).catch((requestError) => setError(getErrorMessage(requestError))).finally(() => setLoadingLedMap(false))
  }, [open, product])
  const update = (field: keyof ProductEditorValues, value: string) => setValues((current) => ({ ...current, [field]: value }))
  const requiredCount = useMemo(() => [values.name, values.sectorName, values.rack, values.row].filter((value) => value.trim()).length, [values])

  const submit = async () => {
    if (values.name.trim().length < 2) return setError('Ingresá un nombre de al menos 2 caracteres.')
    if (!values.sectorName.trim() || !values.rack.trim() || !values.row.trim()) return setError('Completá sector, rack y fila para ubicar el producto.')
    const maxActiveLeds = ledMap.device?.maxActiveLeds ?? 10
    const expectedLedCount = Number(values.ledSelectionCount)
    if (!Number.isInteger(expectedLedCount) || expectedLedCount < 0 || expectedLedCount > maxActiveLeds) return setError(`La cantidad de LEDs debe estar entre 0 y ${maxActiveLeds}.`)
    if (values.ledNumbers.length !== expectedLedCount) return setError(`Seleccioná exactamente ${expectedLedCount} LED${expectedLedCount === 1 ? '' : 's'} en la tira visual.`)

    setSaving(true); setError(null)
    let productId = product?.id
    let created = false
    try {
      if (productId) {
        await warehouseRequest(`/api/productos/${productId}`, { method: 'PATCH', body: JSON.stringify({ code: values.code.trim() || null, name: values.name.trim(), description: values.description.trim() || null }) })
      } else {
        const result = await warehouseRequest<{ data: { id: string } }>('/api/productos', { method: 'POST', body: JSON.stringify({ code: values.code.trim() || undefined, name: values.name.trim(), description: values.description.trim() || undefined, unit: 'UN', cost: 0, price: 0, stock: 0 }) })
        productId = result.data.id; created = true
      }

      try {
        await warehouseRequest(`/api/warehouse/products/${productId}/location`, { method: 'POST', body: JSON.stringify({ sectorName: values.sectorName.trim(), rack: values.rack.trim(), row: values.row.trim(), box: values.box.trim() || undefined, observations: values.observations.trim() || undefined, ledNumbers: values.ledNumbers, ledSelectionCount: expectedLedCount }) })
      } catch (locationError) {
        if (created) { onSaved(`Producto creado. La ubicación quedó pendiente: ${getErrorMessage(locationError)}`, 'warning'); onClose(); return }
        throw locationError
      }
      onSaved(product ? 'Producto y ubicación actualizados.' : 'Producto creado y ubicado correctamente.')
      onClose()
    } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !saving) onClose() }} title={product ? 'Editar producto' : 'Nuevo producto de depósito'} description={product ? 'Actualizá el catálogo y la señalización física.' : 'Registrá el producto y dejalo listo para encontrarlo.'} className="w-[min(calc(100vw-1rem),64rem)] max-h-[min(92vh,940px)]" footer={<><button type="button" className="ui-button ui-button-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="ui-button ui-button-primary" onClick={submit} disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}</button></>}>
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/[.06] p-4"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-background/70 text-primary"><Package size={18} /></div><div><p className="text-sm font-semibold text-foreground">Alta rápida</p><p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">Los datos marcados con * son necesarios para que el depósito pueda ubicar el producto.</p></div></div><span className="shrink-0 rounded-full border border-primary/20 bg-background/60 px-2.5 py-1 text-xs font-semibold text-primary">{requiredCount}/4</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-primary/10"><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${requiredCount * 25}%` }} /></div></div>

      {error ? <div className="warehouse-error rounded-xl" role="alert" aria-live="polite"><AlertCircle size={18} className="shrink-0" /><span>{error}</span></div> : null}

      <section className="rounded-2xl border border-border/80 bg-card/40 p-4 md:p-5"><SectionHeading step="01" icon={Package} title="Datos del producto" description="Identificación para búsquedas y consultas por WhatsApp." /><div className="grid gap-4 sm:grid-cols-2"><Field label="Código" value={values.code} onChange={(value) => update('code', value)} placeholder="Ej: PC06" hint="Opcional, pero recomendado." autoComplete="off" /><Field label="Nombre *" value={values.name} onChange={(value) => update('name', value)} placeholder="Ej: Soporte metálico" required autoComplete="off" /></div><label className="ui-field mt-4"><span className="ui-label">Descripción</span><textarea className="input-field min-h-20 resize-y" value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Material, medida o detalle que ayude a reconocerlo." rows={3} /><span className="ui-field-hint">También se usa para encontrar productos por texto natural.</span></label></section>

      <section className="rounded-2xl border border-border/80 bg-card/40 p-4 md:p-5"><SectionHeading step="02" icon={MapPin} title="Ubicación física" description="La ruta que verá el operario cuando consulte el producto." /><div className="grid gap-4 sm:grid-cols-2"><Field label="Sector *" value={values.sectorName} onChange={(value) => update('sectorName', value)} placeholder="Ej: Herrajes" required autoComplete="off" /><Field label="Rack *" value={values.rack} onChange={(value) => update('rack', value)} placeholder="Ej: H1" required autoComplete="off" /><Field label="Fila / nivel *" value={values.row} onChange={(value) => update('row', value)} placeholder="Ej: 2" required inputMode="numeric" autoComplete="off" /><Field label="Caja" value={values.box} onChange={(value) => update('box', value)} placeholder="Ej: B" autoComplete="off" /></div></section>

      <section className="rounded-2xl border border-primary/20 bg-primary/[.045] p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Lightbulb size={17} /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-foreground">Mapa visual de la tira LED</h3><span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">ESP32</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Elegí los puntos exactos que se encenderán para este producto.</p></div></div>
          <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground">{ledMap.device ? `${ledMap.device.ledCount} LEDs · ${ledMap.device.name}` : 'Sin dispositivo'}</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[13rem_1fr]">
          <Field label="LEDs para el producto" value={values.ledSelectionCount} onChange={(value) => {
            const nextLimit = Math.max(0, Number(value) || 0)
            setValues((current) => ({ ...current, ledSelectionCount: value, ledNumbers: current.ledNumbers.slice(0, nextLimit) }))
          }} type="number" min="0" inputMode="numeric" hint={`Máximo simultáneo: ${ledMap.device?.maxActiveLeds ?? 10}.`} />
          <label className="ui-field"><span className="ui-label">Referencia interna</span><input className="input-field" value={values.observations} onChange={(event) => update('observations', event.target.value)} placeholder="Ej: junto a la caja azul" /><span className="ui-field-hint">Ayuda visual para el operario.</span></label>
        </div>

        <div className="mt-4 rounded-2xl border border-border/80 bg-background/50 p-3 md:p-4">
          {loadingLedMap ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle size={18} className="animate-spin" /> Cargando tira LED...</div> : ledMap.device ? <LedStripCanvas totalLeds={ledMap.device.ledCount} selected={values.ledNumbers} selectionLimit={Math.max(0, Number(values.ledSelectionCount) || 0)} assignments={ledMap.assignments} currentProductId={product?.id} onChange={(ledNumbers) => setValues((current) => ({ ...current, ledNumbers, ledNumber: ledNumbers[0] == null ? '' : String(ledNumbers[0]) }))} /> : <div className="warehouse-error rounded-xl"><AlertCircle size={18} /><span>Primero registrá un ESP32 activo para cargar su tira y asignar LEDs.</span></div>}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">{values.ledNumbers.length ? values.ledNumbers.map((led) => <button type="button" key={led} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary" onClick={() => setValues((current) => ({ ...current, ledNumbers: current.ledNumbers.filter((value) => value !== led) }))}>LED {led}<X size={12} /></button>) : <span className="text-xs text-muted-foreground">Todavía no seleccionaste LEDs.</span>}</div>
          <span className={`text-xs font-semibold ${values.ledNumbers.length === Number(values.ledSelectionCount) ? 'text-primary' : 'text-amber-500'}`}>{values.ledNumbers.length}/{Math.max(0, Number(values.ledSelectionCount) || 0)} seleccionados</span>
        </div>
      </section>

      <div className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground"><Box size={15} className="mt-0.5 shrink-0 text-primary" /><span>Si todavía no querés señalizarlo, indicá 0 LEDs; después podés volver y asignarlos desde Productos.</span><ChevronRight size={14} className="mt-0.5 shrink-0 opacity-60" /></div>
    </div>
  </Dialog>
}

function SectionHeading({ step, icon: Icon, title, description }: { step: string; icon: typeof Package; title: string; description: string }) { return <div className="mb-4 flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">{step}</span><div><div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h2 className="text-sm font-semibold text-foreground">{title}</h2></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div> }

function Field({ label, value, onChange, placeholder, hint, required = false, type = 'text', inputMode, min, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string; required?: boolean; type?: string; inputMode?: 'numeric' | 'text'; min?: string; autoComplete?: string }) { return <label className="ui-field"><span className="ui-label">{label}{required ? <span className="ml-1 text-primary" aria-hidden="true">*</span> : null}</span><input className="input-field min-h-11" type={type} min={min} inputMode={inputMode} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} aria-required={required} />{hint ? <span className="ui-field-hint">{hint}</span> : null}</label> }
