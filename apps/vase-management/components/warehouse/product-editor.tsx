'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, MapPin, Package, Save } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { getErrorMessage, warehouseRequest } from './client'
import type { ProductEditorValues, WarehouseProduct } from './types'

const emptyValues: ProductEditorValues = {
  code: '',
  name: '',
  description: '',
  sectorName: '',
  rack: '',
  row: '',
  box: '',
  observations: '',
  ledNumber: '',
}

function valuesFromProduct(product: WarehouseProduct | null): ProductEditorValues {
  if (!product) return emptyValues
  const location = product.warehouseLocations[0]
  return {
    code: product.code || '',
    name: product.name,
    description: product.description || '',
    sectorName: location?.sector.name || '',
    rack: location?.rack || '',
    row: location?.row || '',
    box: location?.box || '',
    observations: location?.observations || '',
    ledNumber: location?.ledNumber == null ? '' : String(location.ledNumber),
  }
}

export function ProductEditor({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean
  product: WarehouseProduct | null
  onClose: () => void
  onSaved: (message: string, tone?: 'success' | 'warning') => void
}) {
  const [values, setValues] = useState<ProductEditorValues>(emptyValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(valuesFromProduct(product))
      setError(null)
    }
  }, [open, product])

  const update = (field: keyof ProductEditorValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const submit = async () => {
    if (values.name.trim().length < 2) return setError('Ingresá un nombre de al menos 2 caracteres.')
    if (!values.sectorName.trim() || !values.rack.trim() || !values.row.trim()) {
      return setError('Sector, rack y fila son obligatorios para ubicar el producto.')
    }

    setSaving(true)
    setError(null)
    let productId = product?.id
    let created = false

    try {
      if (productId) {
        await warehouseRequest(`/api/productos/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            code: values.code.trim() || null,
            name: values.name.trim(),
            description: values.description.trim() || null,
          }),
        })
      } else {
        const result = await warehouseRequest<{ data: { id: string } }>('/api/productos', {
          method: 'POST',
          body: JSON.stringify({
            code: values.code.trim() || undefined,
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            unit: 'UN',
            cost: 0,
            price: 0,
            stock: 0,
          }),
        })
        productId = result.data.id
        created = true
      }

      try {
        await warehouseRequest(`/api/warehouse/products/${productId}/location`, {
          method: 'POST',
          body: JSON.stringify({
            sectorName: values.sectorName.trim(),
            rack: values.rack.trim(),
            row: values.row.trim(),
            box: values.box.trim() || undefined,
            observations: values.observations.trim() || undefined,
            ledNumber: values.ledNumber === '' ? undefined : Number(values.ledNumber),
          }),
        })
      } catch (locationError) {
        if (created) {
          onSaved(`Producto creado. La ubicación quedó pendiente: ${getErrorMessage(locationError)}`, 'warning')
          onClose()
          return
        }
        throw locationError
      }

      onSaved(product ? 'Producto y ubicación actualizados.' : 'Producto creado y ubicado correctamente.')
      onClose()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => { if (!nextOpen && !saving) onClose() }}
      title={product ? 'Editar producto' : 'Nuevo producto de depósito'}
      description="Completá los datos del catálogo y su ubicación física."
      footer={(
        <>
          <button type="button" className="ui-button ui-button-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="ui-button ui-button-primary" onClick={submit} disabled={saving}>
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando…' : 'Guardar producto'}
          </button>
        </>
      )}
    >
      <div className="space-y-6">
        {error ? <div className="warehouse-error rounded-xl">{error}</div> : null}

        <section>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Package size={17} className="text-primary" /> Datos del producto</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ui-field"><span className="ui-label">Código</span><input className="input-field" value={values.code} onChange={(event) => update('code', event.target.value)} placeholder="Ej: PC06" /></label>
            <label className="ui-field"><span className="ui-label">Nombre *</span><input className="input-field" value={values.name} onChange={(event) => update('name', event.target.value)} placeholder="Nombre del producto" /></label>
            <label className="ui-field sm:col-span-2"><span className="ui-label">Descripción</span><textarea className="input-field min-h-24 resize-y" value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Descripción breve" /></label>
          </div>
        </section>

        <section className="border-t border-border pt-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><MapPin size={17} className="text-primary" /> Ubicación física</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="ui-field"><span className="ui-label">Sector *</span><input className="input-field" value={values.sectorName} onChange={(event) => update('sectorName', event.target.value)} placeholder="Ej: Herrajes" /></label>
            <label className="ui-field"><span className="ui-label">Rack *</span><input className="input-field" value={values.rack} onChange={(event) => update('rack', event.target.value)} placeholder="Ej: H1" /></label>
            <label className="ui-field"><span className="ui-label">Fila / nivel *</span><input className="input-field" value={values.row} onChange={(event) => update('row', event.target.value)} placeholder="Ej: 2" /></label>
            <label className="ui-field"><span className="ui-label">Caja</span><input className="input-field" value={values.box} onChange={(event) => update('box', event.target.value)} placeholder="Ej: B" /></label>
            <label className="ui-field"><span className="ui-label">Índice LED</span><input className="input-field" type="number" min="0" value={values.ledNumber} onChange={(event) => update('ledNumber', event.target.value)} placeholder="Ej: 14" /></label>
            <label className="ui-field"><span className="ui-label">Observaciones</span><input className="input-field" value={values.observations} onChange={(event) => update('observations', event.target.value)} placeholder="Referencia para encontrarlo" /></label>
          </div>
        </section>
      </div>
    </Dialog>
  )
}
