'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type LedAssignment = { productId: string; productCode: string | null; productName: string; ledNumbers: number[] }

export function LedStripCanvas({ totalLeds, selected, selectionLimit, assignments, currentProductId, onChange }: {
  totalLeds: number
  selected: number[]
  selectionLimit: number
  assignments: LedAssignment[]
  currentProductId?: string
  onChange: (next: number[]) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cursor, setCursor] = useState(selected[0] ?? 0)
  const [hovered, setHovered] = useState<number | null>(null)
  const occupied = useMemo(() => {
    const map = new Map<number, LedAssignment>()
    assignments.filter((item) => item.productId !== currentProductId).forEach((item) => item.ledNumbers.forEach((led) => map.set(led, item)))
    return map
  }, [assignments, currentProductId])

  const geometry = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const width = canvas.clientWidth
    const columns = width < 580 ? 10 : 20
    const rows = Math.ceil(totalLeds / columns)
    const paddingX = 28
    const paddingY = 34
    const cellWidth = (width - paddingX * 2) / columns
    const cellHeight = 48
    return { width, height: paddingY * 2 + rows * cellHeight, columns, paddingX, paddingY, cellWidth, cellHeight }
  }, [totalLeds])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const layout = geometry()
    if (!canvas || !layout) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(layout.width * ratio)
    canvas.height = Math.round(layout.height * ratio)
    canvas.style.height = `${layout.height}px`
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    context.clearRect(0, 0, layout.width, layout.height)
    context.fillStyle = '#08130f'
    context.fillRect(0, 0, layout.width, layout.height)
    context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'

    for (let index = 0; index < totalLeds; index += 1) {
      const column = index % layout.columns
      const row = Math.floor(index / layout.columns)
      const x = layout.paddingX + column * layout.cellWidth + layout.cellWidth / 2
      const y = layout.paddingY + row * layout.cellHeight + 10
      const isSelected = selected.includes(index)
      const isOccupied = occupied.has(index)
      const isCursor = cursor === index
      if (isSelected) {
        context.beginPath(); context.fillStyle = 'rgba(52, 211, 153, .2)'; context.arc(x, y, 16, 0, Math.PI * 2); context.fill()
      }
      context.beginPath()
      context.fillStyle = isSelected ? '#34d399' : isOccupied ? '#d08b32' : '#263d33'
      context.arc(x, y, 8, 0, Math.PI * 2)
      context.fill()
      if (isCursor || hovered === index) {
        context.beginPath(); context.strokeStyle = '#ecfdf5'; context.lineWidth = 1.5; context.arc(x, y, 13, 0, Math.PI * 2); context.stroke()
      }
      if (index % 10 === 0) { context.fillStyle = '#789488'; context.fillText(String(index), x, y + 25) }
    }
  }, [cursor, geometry, hovered, occupied, selected, totalLeds])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  const toggle = (index: number) => {
    if (index < 0 || index >= totalLeds || (occupied.has(index) && !selected.includes(index))) return
    if (selected.includes(index)) return onChange(selected.filter((value) => value !== index))
    if (selected.length >= selectionLimit) return
    onChange([...selected, index].sort((a, b) => a - b))
  }

  const indexAtEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const layout = geometry()
    if (!layout) return null
    const rect = event.currentTarget.getBoundingClientRect()
    const column = Math.floor((event.clientX - rect.left - layout.paddingX) / layout.cellWidth)
    const row = Math.floor((event.clientY - rect.top - layout.paddingY + 14) / layout.cellHeight)
    if (column < 0 || column >= layout.columns || row < 0) return null
    const index = row * layout.columns + column
    return index < totalLeds ? index : null
  }

  return <div className="space-y-3">
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-emerald-900/60 bg-[#08130f]"
      tabIndex={0}
      role="application"
      aria-label={`Selector visual de ${totalLeds} LEDs. ${selected.length} seleccionados.`}
      onPointerMove={(event) => { const index = indexAtEvent(event); setHovered(index) }}
      onPointerLeave={() => setHovered(null)}
      onPointerDown={(event) => { const index = indexAtEvent(event); if (index != null) { setCursor(index); toggle(index) } }}
      onKeyDown={(event) => {
        const columns = geometry()?.columns ?? 20
        if (event.key === 'ArrowRight') setCursor((value) => Math.min(value + 1, totalLeds - 1))
        else if (event.key === 'ArrowLeft') setCursor((value) => Math.max(value - 1, 0))
        else if (event.key === 'ArrowDown') setCursor((value) => Math.min(value + columns, totalLeds - 1))
        else if (event.key === 'ArrowUp') setCursor((value) => Math.max(value - columns, 0))
        else if (event.key === ' ' || event.key === 'Enter') toggle(cursor)
        else return
        event.preventDefault()
      }}
    />
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-3"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Seleccionado</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Ocupado</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-600" /> Libre</span></div>
      <span>{hovered == null ? 'Hacé clic para seleccionar' : occupied.get(hovered) ? `LED ${hovered}: ${occupied.get(hovered)?.productCode || occupied.get(hovered)?.productName}` : `LED ${hovered}`}</span>
    </div>
  </div>
}
