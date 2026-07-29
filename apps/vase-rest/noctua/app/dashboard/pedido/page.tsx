'use client';

import { Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Users, Clock, ShoppingBag, ChevronUp, ChevronDown } from 'lucide-react';
import { usePedidosStore } from '@/store/pedidosStore';
import { useMesasStore } from '@/store/mesasStore';
import { useProductosCatalog } from '@/hooks/useProductosCatalog';
import { PedidoOrderSummary } from '@/components/pedidos/PedidoOrderSummary';
import { useNowTick, formatElapsedShort } from '@/hooks/useMesaTimer';
import { formatARS } from '@/hooks/lib/utils';
import { toast } from '@/components/ui/Toast';

// Estados de pedido que consideramos "abiertos" (ya enviados pero aún en curso)
const ESTADOS_ABIERTOS = ['pendiente', 'preparando', 'listo'];

function PedidoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mesaId = searchParams.get('mesa');

  const now = useNowTick();

  const mesas = useMesasStore((s) => s.mesas);
  const cargarMesas = useMesasStore((s) => s.cargarMesas);

  const iniciarPedido = usePedidosStore((s) => s.iniciarPedido);
  const agregarItem = usePedidosStore((s) => s.agregarItem);
  const cambiarCantidad = usePedidosStore((s) => s.cambiarCantidad);
  const quitarItem = usePedidosStore((s) => s.quitarItem);
  const setItemNotas = usePedidosStore((s) => s.setItemNotas);
  const enviarPedido = usePedidosStore((s) => s.enviarPedido);
  const cargarPedidosActivos = usePedidosStore((s) => s.cargarPedidosActivos);

  // Estado scoped por mesa: nunca hay sangrado entre mesas
  const borrador = usePedidosStore((s) => (mesaId ? s.borradores[mesaId] : undefined));
  const pedidoEnviado = usePedidosStore((s) =>
    mesaId ? s.pedidos.find((p) => p.mesaId === mesaId && ESTADOS_ABIERTOS.includes(p.estado)) : undefined
  );

  const mesa = useMemo(() => mesas.find((m) => m.id === mesaId), [mesas, mesaId]);

  const { categorias, isLoading, isError, refetch: refetchCatalogo } = useProductosCatalog();

  const [categoriaActiva, setCategoriaActiva] = useState<string>('all');
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Carga inicial: mesas (para el header) + pedidos activos (ítems ya en cocina)
  useEffect(() => {
    if (mesas.length === 0) cargarMesas();
    cargarPedidosActivos();
  }, [mesas.length, cargarMesas, cargarPedidosActivos]);

  // Garantiza un borrador para esta mesa y actualiza sus metadatos cuando la mesa carga
  useEffect(() => {
    if (!mesaId) return;
    const m = mesas.find((x) => x.id === mesaId);
    const personasActual = m?.personas ?? borrador?.personas ?? 1;
    iniciarPedido(mesaId, m?.numero ?? borrador?.numeroMesa ?? 0, m?.zona ?? borrador?.zona ?? 'SALÓN PRINCIPAL', personasActual);
    // Solo depende de mesaId y de la carga de mesas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaId, mesas]);

  const draftItems = borrador?.items ?? [];
  const sentItems = pedidoEnviado?.items ?? [];
  const comensales = mesa?.personas ?? borrador?.personas;
  const elapsed = mesa?.timerInicio ? formatElapsedShort(mesa.timerInicio, now) : undefined;

  // Productos filtrados por categoría + búsqueda
  const productosVisibles = useMemo(() => {
    const todos =
      categoriaActiva === 'all'
        ? categorias.flatMap((c) => c.productos)
        : categorias.find((c) => c.id === categoriaActiva)?.productos ?? [];
    const q = busqueda.trim().toLowerCase();
    return q ? todos.filter((p) => p.nombre.toLowerCase().includes(q)) : todos;
  }, [categorias, categoriaActiva, busqueda]);

  const handleAdd = useCallback(
    (productoId: string, nombre: string, precio: number) => {
      if (!mesaId) return;
      // Tras enviar a cocina el borrador se limpia; recrearlo antes de agregar
      // para poder seguir sumando productos a la misma mesa.
      if (!usePedidosStore.getState().borradores[mesaId]) {
        const m = mesas.find((x) => x.id === mesaId);
        iniciarPedido(mesaId, m?.numero ?? 0, m?.zona ?? 'SALÓN PRINCIPAL', m?.personas ?? 1);
      }
      agregarItem(mesaId, { productoId, nombre, cantidad: 1, precioUnitario: precio, notas: '' });
    },
    [mesaId, mesas, iniciarPedido, agregarItem]
  );

  const handleEnviar = useCallback(async () => {
    if (!mesaId) return;
    if (!borrador || borrador.items.length === 0) {
      toast.error('Pedido vacío', 'Agregá al menos un producto antes de enviar');
      return;
    }
    setEnviando(true);
    try {
      const res = await enviarPedido(mesaId);
      if (!res) {
        toast.error('No se pudo enviar', 'El pedido quedó vacío');
        return;
      }
      toast.success('Pedido enviado a cocina', `Mesa ${res.numeroMesa} · ${formatARS(res.total)}`);
      cargarPedidosActivos();
      refetchCatalogo(); // el stock cambió → refrescar disponibilidad del catálogo
      setSheetOpen(false);
    } catch (err) {
      // Surfacea el mensaje del backend (ej: "No hay stock suficiente de X").
      // Los ítems que sí entraron ya se quitaron del borrador; el resto sigue editable.
      const msg = err instanceof Error && err.message ? err.message : 'Revisá la conexión e intentá de nuevo';
      toast.error('No se pudo enviar el pedido', msg);
      cargarPedidosActivos();
      refetchCatalogo();
    } finally {
      setEnviando(false);
    }
  }, [mesaId, borrador, enviarPedido, cargarPedidosActivos, refetchCatalogo]);

  // Sin mesa en la URL: no se puede construir un pedido sin saber a qué mesa pertenece
  if (!mesaId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ShoppingBag size={36} className="text-zinc-700" />
        <div>
          <p className="text-white font-semibold">No se indicó ninguna mesa</p>
          <p className="text-[#676b67] text-sm mt-1">Elegí una mesa desde el plano para tomar su pedido.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/mesas')}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 transition-colors"
        >
          Ir al plano de mesas
        </button>
      </div>
    );
  }

  const summary = (
    <PedidoOrderSummary
      draftItems={draftItems}
      sentItems={sentItems}
      draftTotal={borrador?.total ?? 0}
      sentTotal={pedidoEnviado?.total ?? 0}
      enviando={enviando}
      onInc={(id) => { const it = draftItems.find((i) => i.productoId === id); if (it) cambiarCantidad(mesaId, id, it.cantidad + 1); }}
      onDec={(id) => { const it = draftItems.find((i) => i.productoId === id); if (it && it.cantidad > 1) cambiarCantidad(mesaId, id, it.cantidad - 1); }}
      onRemove={(id) => quitarItem(mesaId, id)}
      onSetNotas={(id, notas) => setItemNotas(mesaId, id, notas)}
      onEnviar={handleEnviar}
    />
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header fijo con identidad de mesa — siempre visible */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#1a1a1a] flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard/mesas')}
          className="p-2 rounded-lg bg-[#151515] text-white hover:bg-[#202020] transition-colors flex-shrink-0"
          aria-label="Volver al plano de mesas"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-amber-400 font-black text-2xl leading-none">Mesa {mesa?.numero ?? borrador?.numeroMesa ?? '—'}</span>
          </div>
          <span className="text-zinc-600 text-xs uppercase tracking-widest">{mesa?.zona ?? borrador?.zona}</span>
          {comensales ? (
            <span className="flex items-center gap-1 text-zinc-400 text-xs">
              <Users size={12} /> {comensales}
            </span>
          ) : null}
          {elapsed && (
            <span className="flex items-center gap-1 text-zinc-400 text-xs">
              <Clock size={12} /> {elapsed}
            </span>
          )}
        </div>
      </div>

      {/* Cuerpo: catálogo (izq) + resumen (der, en pantallas grandes) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 pt-3">
        {/* Catálogo */}
        <div className="flex flex-col min-h-0">
          {/* Búsqueda */}
          <div className="relative mb-3 flex-shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg pl-9 pr-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Categorías */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
            <CategoriaChip label="Todos" active={categoriaActiva === 'all'} onClick={() => setCategoriaActiva('all')} />
            {categorias.map((c) => (
              <CategoriaChip key={c.id} label={c.nombre} active={categoriaActiva === c.id} onClick={() => setCategoriaActiva(c.id)} />
            ))}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-24 lg:pb-2">
            {isLoading ? (
              <p className="text-[#676b67] text-sm py-12 text-center">Cargando productos...</p>
            ) : isError ? (
              <p className="text-red-400 text-sm py-12 text-center">No se pudieron cargar los productos.</p>
            ) : productosVisibles.length === 0 ? (
              <p className="text-[#676b67] text-sm py-12 text-center">
                {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay productos en esta categoría'}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {productosVisibles.map((p) => {
                  const disponible = p.disponible;
                  return (
                    <button
                      key={p.id}
                      onClick={() => disponible && handleAdd(p.id, p.nombre, p.precio)}
                      disabled={!disponible}
                      className={`text-left bg-[#111] border border-[#222] rounded-xl p-3 transition-all ${
                        disponible ? 'hover:border-amber-500/50 active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{p.nombre}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white font-bold text-sm">{formatARS(p.precio)}</span>
                        {!disponible && <span className="text-[10px] text-red-400">Agotado</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resumen — columna derecha en desktop */}
        <div className="hidden lg:flex flex-col min-h-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {summary}
        </div>
      </div>

      {/* Resumen — bottom sheet en tablet/portrait y mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* Barra colapsada */}
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-[#0d0d0d] border-t border-[#222] px-4 py-3"
        >
          <span className="flex items-center gap-2 text-white text-sm font-semibold">
            <ShoppingBag size={16} className="text-amber-400" />
            {draftItems.length} por enviar
          </span>
          <span className="flex items-center gap-2 text-white text-sm font-mono">
            {formatARS(borrador?.total ?? 0)}
            {sheetOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </button>
        {/* Panel expandido */}
        {sheetOpen && (
          <div className="bg-[#0a0a0a] border-t border-[#1a1a1a] max-h-[70vh] flex flex-col">
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoriaChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
        active ? 'bg-amber-600 text-white' : 'bg-[#151515] text-[#676b67] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

export default function PedidoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#676b67]">Cargando...</div>}>
      <PedidoContent />
    </Suspense>
  );
}
