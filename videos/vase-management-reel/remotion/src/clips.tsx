// Clips de interfaz del reel Vase Management (E5–E9 de guion/escenas.md). Sin titulos: los subtitulos los pone HyperFrames.
// Cada clip recibe `ev` = cuadros (relativos al inicio del clip) de las palabras clave de la voz.
// Zona de contenido y≈130–1250; la franja de subtitulos (y≈1300–1600) queda libre.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO, SERIF } from './theme';
import { AppWindow, Backdrop, Badge, Cursor, Icon, Kpi, PageHeader, Panel, Toast, clamp, fade, money, pulse, shake, useSpring } from './ui';

export type Ev = Record<string, number>;
export type ClipProps = { dur: number; ev: Ev };

const TH: React.CSSProperties = { fontSize: 26, fontWeight: 700, color: C.muted, lineHeight: 1.1 };
const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

const Field: React.FC<{ label: string; value: React.ReactNode; w: number; focus?: number; error?: boolean; style?: React.CSSProperties }> = ({ label, value, w, focus = 0, error, style }) => (
  <div style={{ width: w, ...style }}>
    <div style={{ fontSize: 26, fontWeight: 700, color: C.fg, marginBottom: 8 }}>{label}</div>
    <div
      style={{
        height: 66,
        borderRadius: 18,
        border: `2px solid ${error ? C.red : focus > 0.01 ? C.primary : '#c5d0dc'}`,
        boxShadow: focus > 0.01 ? `0 0 0 ${6 * focus}px ${error ? 'rgba(196,31,31,0.15)' : 'rgba(0,107,67,0.12)'}` : 'none',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 18px',
        fontSize: 28,
        fontWeight: 600,
        color: C.fg,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {value}
    </div>
  </div>
);

/* ===== E5 · Nueva venta: descuenta stock y no deja vender lo que no hay ===== */
export const Venta: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const VEND = ev.vendes ?? 13;
  const DESC = ev.descuenta ?? 43;
  const NOT = ev.notenes ?? 86;
  const VENDERLO = ev.venderlo ?? 123;
  const modal = useSpring(0, 15);
  const sold = frame >= VEND;
  // la busqueda cambia de aceite a yerba entre la venta y "no lo tenes"
  const YERBA_T = Math.max(DESC + 16, NOT - 22);
  const yerba = frame >= YERBA_T;
  const q = yerba ? 'yerba'.slice(0, Math.max(0, Math.floor((frame - YERBA_T) / 2) + 1)) : 'aceite'.slice(0, Math.floor(frame / 1.5) + 1);
  const stockA = Math.round(interpolate(frame, [DESC, DESC + 14], [24, 18], clamp));
  const chipHot = frame >= DESC && !yerba ? 1 : 0;
  const rowY = useSpring(YERBA_T + 6, 14);
  const typed5 = frame >= NOT;
  const err = frame >= VENDERLO;
  const sh = shake(frame, VENDERLO, 14, 16);
  const btnPress = frame >= VEND && frame < VEND + 4;
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AppWindow section="Comercial · Ventas">
        <PageHeader title="Ventas" subtitle="Gestión de ventas, pedidos y presupuestos" />
        {/* overlay del dialogo */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,16,12,0.55)', opacity: modal }} />
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 20,
            right: 20,
            borderRadius: 32,
            background: 'rgba(250,252,253,0.98)',
            boxShadow: '0 32px 100px -30px rgba(0,0,0,.55)',
            overflow: 'hidden',
            opacity: modal,
            transform: `scale(${0.92 + modal * 0.08})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 30px', borderBottom: `1.5px solid ${C.border}` }}>
            <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, letterSpacing: -0.5 }}>Nueva venta</div>
            <Icon name="x" size={36} color={C.muted} />
          </div>
          <div style={{ padding: '16px 30px 20px' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <Field label="Tipo" value="Venta" w={210} />
              <Field label="Cliente" value="Almacén Güemes" w={390} />
              <Field label="Fecha" value={<span style={num}>13/10/2026</span>} w={240} />
            </div>
            <div style={{ marginTop: 14 }}>
              <Field
                label="Agregar producto"
                w={880}
                focus={1}
                value={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Icon name="search" size={30} color={C.muted} />
                    {q}
                    <span style={{ width: 3, height: 34, background: C.primary, opacity: caret ? 1 : 0 }} />
                  </span>
                }
              />
            </div>
            {/* resultado del buscador */}
            <div style={{ marginTop: 10, borderRadius: 20, border: `1.5px solid ${C.border}`, background: '#fff', padding: '16px 22px', boxShadow: '0 16px 40px -24px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{yerba ? 'Yerba mate 1 kg' : 'Aceite de girasol 1,5 L'}</div>
                <div style={{ fontSize: 26, color: C.muted, fontFamily: MONO, marginTop: 2 }}>{yerba ? 'YER-1000' : 'ACE-150'}</div>
              </div>
              <div
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  fontSize: 30,
                  fontWeight: 800,
                  ...num,
                  background: yerba ? C.amberSoft : chipHot ? C.mint : C.surface,
                  color: yerba ? C.amber : chipHot ? C.ink : C.muted,
                  transform: `scale(${1 + (chipHot ? 0.12 * Math.exp(-(frame - DESC) / 10) : 0)})`,
                  boxShadow: chipHot ? '0 0 0 6px rgba(79,224,168,0.3)' : 'none',
                }}
              >
                Stock: {yerba ? 3 : stockA} u
              </div>
            </div>
            {/* items */}
            <div style={{ marginTop: 16, borderRadius: 20, border: `1.5px solid ${C.border}`, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '12px 20px', background: C.surface, ...TH }}>
                <div style={{ width: 330 }}>Producto</div>
                <div style={{ width: 110 }}>Cant.</div>
                <div style={{ width: 170 }}>Precio</div>
                <div style={{ width: 90 }}>IVA</div>
                <div style={{ flex: 1, textAlign: 'right' }}>Total</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', fontSize: 28, fontWeight: 600, opacity: yerba ? 0.45 : 1 }}>
                <div style={{ width: 330, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {sold ? <Icon name="checkCircle" size={30} color={C.green} /> : null}Aceite girasol 1,5 L
                </div>
                <div style={{ width: 110, ...num }}>6</div>
                <div style={{ width: 170, ...num }}>$ 3.950,00</div>
                <div style={{ width: 90, ...num }}>21 %</div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 800, ...num }}>$ 28.677,00</div>
              </div>
              {frame >= YERBA_T + 6 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 20px',
                    fontSize: 28,
                    fontWeight: 600,
                    borderTop: `1.5px solid ${C.border}`,
                    background: err ? C.redSoft : '#fff',
                    opacity: rowY,
                    transform: `translateY(${(1 - rowY) * -30}px) translateX(${sh}px)`,
                  }}
                >
                  <div style={{ width: 330 }}>
                    <div style={{ fontWeight: 800 }}>Yerba mate 1 kg</div>
                    <div style={{ fontSize: 26, color: err ? C.red : C.muted, fontWeight: 700 }}>Stock: 3 u</div>
                  </div>
                  <div style={{ width: 110 }}>
                    <div style={{ width: 84, height: 60, borderRadius: 14, border: `3px solid ${err ? C.red : C.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: err ? C.red : C.fg, background: '#fff' }}>
                      {typed5 ? '5' : <span style={{ width: 3, height: 30, background: C.primary, opacity: caret ? 1 : 0 }} />}
                    </div>
                  </div>
                  <div style={{ width: 170, ...num }}>$ 4.900,00</div>
                  <div style={{ width: 90, ...num }}>21 %</div>
                  <div style={{ flex: 1, textAlign: 'right', fontWeight: 800, ...num, color: err ? C.red : C.fg, textDecoration: err ? 'line-through' : 'none' }}>{typed5 ? '$ 29.645,00' : '—'}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.muted }}>
                Total <span style={{ color: C.fg, fontWeight: 800, fontSize: 38, ...num }}>{yerba ? (typed5 ? '$ 29.645,00' : '$ 0,00') : '$ 28.677,00'}</span>
              </div>
              <div
                style={{
                  padding: '18px 40px',
                  borderRadius: 999,
                  background: err ? '#94a3b8' : C.primary,
                  color: '#fff',
                  fontSize: 30,
                  fontWeight: 800,
                  boxShadow: '0 14px 30px -14px rgba(0,107,67,0.9)',
                  transform: `scale(${btnPress ? 0.94 : 1})`,
                }}
              >
                Crear venta
              </div>
            </div>
          </div>
        </div>
      </AppWindow>
      <Cursor
        path={[
          { f: 0, x: 620, y: 760 },
          { f: Math.max(2, VEND - 3), x: 880, y: 912 },
          { f: VEND + 14, x: 880, y: 912 },
          { f: YERBA_T + 4, x: 640, y: 560 },
          { f: NOT - 4, x: 472, y: 905 },
          { f: VENDERLO - 6, x: 472, y: 905 },
          { f: VENDERLO - 1, x: 880, y: 1005 },
        ]}
        clicks={[VEND, NOT - 3, VENDERLO]}
      />
      <Toast at={VEND} until={YERBA_T - 6} type="success" title="Venta creada" desc="$ 28.677,00" />
      <Toast at={VENDERLO} type="error" title="Stock insuficiente" desc="disponible 3, solicitado 5" />
    </AbsoluteFill>
  );
};

/* ===== E6 · Stock Crítico: te avisa que reponer ===== */
const CRIT = [
  { p: 'Yerba mate 1 kg', cat: 'Almacén', st: 3, min: 12, falt: 9, cost: '$ 34.200,00' },
  { p: 'Lavandina 2 L', cat: 'Limpieza', st: 0, min: 10, falt: 10, cost: '$ 12.500,00' },
  { p: 'Fideos tirabuzón 500 g', cat: 'Almacén', st: 4, min: 20, falt: 16, cost: '$ 14.400,00' },
];
export const Reponer: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const AV = ev.avisa ?? 17;
  const REP = ev.reponer ?? 31;
  const YA = ev.yatenes ?? 85;
  const notif = useSpring(AV, 13);
  const notifOut = fade(frame, YA - 14, YA - 6);
  const col = fade(frame, REP, REP + 6);
  const okPulse = pulse(frame, YA, 9, 3);
  const tick = useSpring(YA, 9);
  const W = [370, 120, 110, 120, 210];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AppWindow section="Operaciones · Stock" bell={AV} badge={frame >= AV ? 1 : undefined}>
        <PageHeader title="Stock Crítico" subtitle="Productos que requieren reposición inmediata" />
        <div style={{ display: 'flex', gap: 18 }}>
          <Kpi style={{ flex: 1 }} delay={4} label="Sin stock / Crítico" value="3" icon="alert" tone="danger" valueSize={64} />
          <Kpi style={{ flex: 1 }} delay={7} label="Stock bajo" value="7" icon="box" tone="warning" valueSize={64} />
          <div style={{ flex: 1, position: 'relative' }}>
            <Kpi style={{ height: '100%' }} delay={10} label="Stock OK" value="142" icon="checkCircle" tone="success" valueSize={64} glow={frame >= YA ? 0.5 + okPulse * 0.5 : 0} />
            {frame >= YA && (
              <div style={{ position: 'absolute', right: 18, bottom: 18, width: 70, height: 70, borderRadius: 35, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${tick})`, boxShadow: '0 0 30px rgba(22,163,74,0.6)' }}>
                <Icon name="check" size={44} color="#fff" stroke={3.4} />
              </div>
            )}
          </div>
        </div>
        <Panel style={{ marginTop: 24, overflow: 'hidden', position: 'relative' }}>
          {/* columna resaltada "Costo reponer" */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: W[4] + 26, background: 'rgba(79,224,168,0.22)', borderLeft: `3px solid ${C.primary}`, opacity: col }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '18px 22px', background: 'rgba(238,242,246,0.9)', ...TH, position: 'relative' }}>
            <div style={{ width: W[0] }}>Producto</div>
            <div style={{ width: W[1] }}>Stock actual</div>
            <div style={{ width: W[2] }}>Mínimo</div>
            <div style={{ width: W[3] }}>Faltante</div>
            <div style={{ flex: 1, textAlign: 'right', color: col > 0.5 ? C.primary : C.muted }}>Costo reponer</div>
          </div>
          {CRIT.map((r, i) => {
            const a = useSpring(8 + i * 4, 15);
            const hot = i === 0 && frame >= AV ? 1 : 0;
            return (
              <div key={r.p} style={{ display: 'flex', alignItems: 'center', padding: '24px 22px', borderTop: `1.5px solid ${C.border}`, fontSize: 30, fontWeight: 600, position: 'relative', opacity: a, transform: `translateX(${(1 - a) * 80}px)`, background: hot ? 'rgba(253,240,220,0.8)' : 'transparent' }}>
                <div style={{ width: W[0] }}>
                  <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{r.p}</div>
                  <div style={{ fontSize: 26, color: C.muted }}>{r.cat}</div>
                </div>
                <div style={{ width: W[1], ...num, fontWeight: 800, color: r.st === 0 ? C.red : C.amber }}>{r.st}</div>
                <div style={{ width: W[2], ...num }}>{r.min}</div>
                <div style={{ width: W[3], ...num, color: C.red, fontWeight: 700 }}>{r.falt}</div>
                <div style={{ flex: 1, textAlign: 'right', ...num, fontWeight: col > 0.5 ? 800 : 600, color: col > 0.5 ? C.primary : C.fg }}>{r.cost}</div>
              </div>
            );
          })}
        </Panel>
        {/* desplegable de la campana */}
        {frame >= AV && (
          <div
            style={{
              position: 'absolute',
              top: -12,
              right: 24,
              width: 760,
              borderRadius: 26,
              background: '#fff',
              border: `1.5px solid ${C.border}`,
              boxShadow: '0 40px 90px -20px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              opacity: notif * (1 - notifOut),
              transform: `translateY(${(1 - notif) * -60}px)`,
              transformOrigin: 'top right',
              zIndex: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1.5px solid ${C.border}`, fontSize: 26 }}>
              <span style={{ fontWeight: 800 }}>Notificaciones</span>
              <span style={{ color: C.muted, fontWeight: 600 }}>1 sin leer</span>
            </div>
            <div style={{ display: 'flex', gap: 18, padding: '20px 24px', background: 'rgba(253,240,220,0.6)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: C.amberSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="alert" size={32} color={C.orange} />
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>Stock bajo</div>
                <div style={{ fontSize: 28, fontWeight: 600, color: C.muted, lineHeight: 1.3 }}>Yerba mate 1 kg tiene 3 unidades (mínimo: 12)</div>
              </div>
            </div>
          </div>
        )}
      </AppWindow>
    </AbsoluteFill>
  );
};

/* ===== E7 · Pedidos de la tienda online que entran solos ===== */
const OLD = [
  ['1042', 'Venta', 'Kiosco Los Troncos', '12/10/2026', '$ 18.940,00', 'Pendiente'],
  ['1041', 'Pedido', 'Despensa Mogotes', '12/10/2026', '$ 64.200,00', 'Confirmado'],
  ['1040', 'Venta', 'Almacén Güemes', '11/10/2026', '$ 32.450,00', 'Entregado'],
  ['1039', 'Venta', 'Kiosco Plaza Mitre', '11/10/2026', '$ 9.870,00', 'Pendiente'],
];
const NEW = ['1043', 'Venta', 'Rotisería La Feliz', '13/10/2026', '$ 46.320,00', 'Confirmado'];
const VW = [70, 96, 266, 170, 168];
const tone = (s: string) => (s === 'Pendiente' ? 'warning' : 'info') as 'warning' | 'info';
const SaleRow: React.FC<{ r: string[]; style?: React.CSSProperties }> = ({ r, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', height: 104, padding: '0 12px', borderTop: `1.5px solid ${C.border}`, fontSize: 26, fontWeight: 600, ...style }}>
    <div style={{ width: VW[0], fontFamily: MONO, fontWeight: 600, color: C.muted }}>{r[0]}</div>
    <div style={{ width: VW[1] }}>{r[1]}</div>
    <div style={{ width: VW[2], fontWeight: 800, whiteSpace: 'nowrap' }}>{r[2]}</div>
    <div style={{ width: VW[3], ...num, color: C.muted }}>{r[3]}</div>
    <div style={{ width: VW[4], ...num, fontWeight: 800 }}>{r[4]}</div>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
      <Badge tone={tone(r[5])} style={{ padding: '4px 12px' }}>{r[5]}</Badge>
    </div>
  </div>
);
export const Pedidos: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const PED = ev.pedidos ?? 18;
  const ENT = ev.entran ?? 57;
  const DOS = ev.dos ?? 110;
  const bubble = useSpring(PED, 11);
  const drop = interpolate(frame, [ENT, ENT + 10], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const flashRow = interpolate(frame, [ENT + 4, ENT + 30], [1, 0.25], clamp);
  const x2 = useSpring(DOS, 9);
  const x2out = fade(frame, DOS + 24, DOS + 32);
  const strike = interpolate(frame, [DOS + 6, DOS + 14], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AppWindow section="Comercial · Ventas" side={16} pad={20}>
        <PageHeader
          title="Ventas"
          subtitle="Gestión de ventas, pedidos y presupuestos"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 26px', borderRadius: 16, background: C.primary, color: '#fff', fontSize: 26, fontWeight: 800, whiteSpace: 'nowrap' }}>
              <Icon name="plus" size={28} color="#fff" /> Nueva venta
            </div>
          }
        />
        <Panel style={{ overflow: 'hidden', marginTop: 150 }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 70, padding: '0 12px', background: 'rgba(238,242,246,0.9)', ...TH }}>
            <div style={{ width: VW[0] }}>#</div>
            <div style={{ width: VW[1] }}>Tipo</div>
            <div style={{ width: VW[2] }}>Cliente</div>
            <div style={{ width: VW[3] }}>Fecha</div>
            <div style={{ width: VW[4] }}>Total</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Estado</div>
          </div>
          <div style={{ height: 104 * drop, overflow: 'hidden' }}>
            <SaleRow r={NEW} style={{ background: `rgba(79,224,168,${0.45 * flashRow})`, borderLeft: `8px solid ${C.brand}`, transform: `translateY(${(drop - 1) * 104}px)` }} />
          </div>
          {OLD.map((r) => (
            <SaleRow key={r[0]} r={r} />
          ))}
        </Panel>
      </AppWindow>
      {/* globo grafico (no es UI de la app): el origen del pedido */}
      <div style={{ position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '22px 36px',
            borderRadius: 999,
            background: C.ink,
            border: `3px solid ${C.mint}`,
            color: '#fff',
            fontSize: 36,
            fontWeight: 800,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(79,224,168,0.45)',
            opacity: bubble,
            transform: `scale(${0.4 + bubble * 0.6}) rotate(${(1 - bubble) * -6}deg)`,
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.mint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cart" size={36} color={C.ink} />
          </div>
          <span>
            Nuevo pedido <span style={{ color: C.mint }}>· tu tienda online</span>
          </span>
        </div>
      </div>
      {/* ×2 tachado */}
      {frame >= DOS && (
        <div style={{ position: 'absolute', top: 760, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - x2out }}>
          <div style={{ position: 'relative', padding: '10px 50px', borderRadius: 40, background: 'rgba(13,17,24,0.92)', transform: `scale(${x2}) rotate(-6deg)`, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ fontFamily: FONT, fontSize: 200, fontWeight: 800, color: '#fff', letterSpacing: -6, lineHeight: 1.1 }}>×2</div>
            <div style={{ position: 'absolute', left: 20, right: 20, top: '50%', height: 22, borderRadius: 11, background: '#ef4444', transform: `scaleX(${strike}) rotate(-14deg)`, transformOrigin: 'left center' }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ===== E8 · Riesgo Crediticio: quien te debe, cuanto y quien se paso del limite ===== */
const RIESGO = [
  { c: 'Despensa Mogotes', id: '30-71458962-3', lim: '$ 300.000', deu: '$ 342.800', uso: 114, r: 'Alto' },
  { c: 'Almacén Güemes', id: '20-28473615-9', lim: '$ 400.000', deu: '$ 405.100', uso: 101, r: 'Medio' },
  { c: 'Rotisería La Feliz', id: '27-33190428-4', lim: '$ 150.000', deu: '$ 126.000', uso: 84, r: 'Medio' },
  { c: 'Kiosco Los Troncos', id: '23-30562871-5', lim: '$ 250.000', deu: '$ 186.000', uso: 74, r: 'Bajo' },
];
export const Riesgo: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const DEBE = ev.debe ?? 29;
  const CU = ev.cuanto ?? 39;
  const LIM = ev.limite ?? 91;
  const deuda = interpolate(frame, [DEBE, DEBE + 22], [0, 1284500], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const col = fade(frame, CU, CU + 6);
  const blink = frame >= LIM ? (Math.floor((frame - LIM) / 5) % 2 === 0 ? 1 : 0.35) : 0;
  const W = [300, 160, 175, 185];
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AppWindow section="Comercial · Clientes">
        <PageHeader title="Riesgo Crediticio" subtitle="Análisis de riesgo y límites de crédito por cliente" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Kpi delay={3} label="Total clientes" value="86" icon="users" tone="neutral" valueSize={42} style={{ padding: '18px 22px' }} />
          <Kpi delay={6} label="Riesgo alto/bloqueado" value="3" icon="alert" tone="danger" valueSize={42} style={{ padding: '18px 22px' }} />
          <Kpi delay={9} label="Deuda total" value={money(Math.round(deuda))} icon="wallet" tone="warning" valueSize={42} glow={frame >= DEBE && frame < DEBE + 30 ? 0.6 : 0} style={{ padding: '18px 22px' }} />
          <Kpi delay={12} label="Exceden límite" value="2" icon="alertCircle" tone="danger" valueSize={42} glow={pulse(frame, LIM, 10, 4)} style={{ padding: '18px 22px' }} />
        </div>
        <Panel style={{ marginTop: 14, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 22 + W[0] + W[1] - 10, width: W[2] - 4, background: 'rgba(253,240,220,0.9)', borderLeft: `3px solid ${C.amber}`, borderRight: `3px solid ${C.amber}`, opacity: col }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '14px 22px', background: 'rgba(238,242,246,0.9)', ...TH, position: 'relative' }}>
            <div style={{ width: W[0] }}>Cliente · CUIT/DNI</div>
            <div style={{ width: W[1] }}>Límite crédito</div>
            <div style={{ width: W[2], color: col > 0.5 ? C.amber : C.muted }}>Deuda actual</div>
            <div style={{ width: W[3], paddingLeft: 12 }}>Uso %</div>
            <div style={{ flex: 1, textAlign: 'right' }}>Riesgo</div>
          </div>
          {RIESGO.map((r, i) => {
            const a = useSpring(10 + i * 3, 15);
            const over = r.uso > 100;
            const bar = r.uso > 100 ? '#ef4444' : r.uso >= 80 ? '#f59e0b' : C.green;
            const fill = interpolate(frame, [12 + i * 3, 34 + i * 3], [0, Math.min(100, r.uso)], clamp);
            return (
              <div key={r.c} style={{ display: 'flex', alignItems: 'center', padding: '8px 22px', borderTop: `1.5px solid ${C.border}`, fontSize: 28, fontWeight: 600, position: 'relative', opacity: a, background: over && blink ? `rgba(239,68,68,${0.22 * blink})` : 'transparent', transform: `translateX(${(1 - a) * 80 + (over ? shake(frame, LIM, 10, 8) : 0)}px)` }}>
                <div style={{ width: W[0] }}>
                  <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{r.c}</div>
                  <div style={{ fontSize: 26, color: C.muted, fontFamily: MONO }}>{r.id}</div>
                </div>
                <div style={{ width: W[1], ...num }}>{r.lim}</div>
                <div style={{ width: W[2], ...num, fontWeight: 800, color: over ? C.red : C.fg }}>{r.deu}</div>
                <div style={{ width: W[3], display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12 }}>
                  <div style={{ width: 70, height: 14, borderRadius: 7, background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ width: `${fill}%`, height: '100%', background: bar }} />
                  </div>
                  <span style={{ ...num, fontWeight: 800, color: over ? C.red : C.fg }}>{r.uso} %</span>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <Badge tone={r.r === 'Alto' ? 'danger' : r.r === 'Medio' ? 'warning' : 'success'} style={{ padding: '4px 14px' }}>{r.r}</Badge>
                </div>
              </div>
            );
          })}
        </Panel>
      </AppWindow>
    </AbsoluteFill>
  );
};

/* ===== E9 · Dashboard: ventas y caja de un vistazo ===== */
const SALES = Array.from({ length: 30 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const n = r - Math.floor(r);
  const weekend = i % 7 === 5 || i % 7 === 6;
  return Math.round((220 + i * 6 + n * 160) * (weekend ? 0.55 : 1));
});
export const Tablero: React.FC<ClipProps> = ({ ev }) => {
  const frame = useCurrentFrame();
  const VEN = ev.ventas ?? 18;
  const CAJ = ev.caja ?? 36;
  const VIS = ev.vistazo ?? 50;
  const draw = interpolate(frame, [VEN, VEN + 22], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 2) });
  const zoom = interpolate(frame, [0, VIS, VIS + 14], [1.04, 1.04, 0.9], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const g1 = frame >= VEN ? Math.max(0.35, pulse(frame, VEN, 12, 2)) : 0;
  const g2 = frame >= CAJ ? Math.max(0.35, pulse(frame, CAJ, 12, 2)) : 0;
  const CW = 860, CH = 250, max = Math.max(...SALES);
  const bw = CW / SALES.length;
  const line = SALES.map((v, i) => `${i ? 'L' : 'M'} ${i * bw + bw / 2} ${CH - (v / max) * (CH - 20)}`).join(' ');
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop />
      <AppWindow section="Inicio" zoom={zoom}>
        <PageHeader title="Dashboard" subtitle="Bienvenido, Martín. Aquí está el resumen de tu empresa." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Kpi delay={2} label="Ventas del mes" value="$ 8.742.300,00" valueSize={40} icon="trending" tone="info" glow={g1} sub={<><span style={{ color: C.green, fontWeight: 800 }}>↑ 12 %</span> · 312 operaciones</>} style={{ padding: '18px 22px' }} />
          <Kpi delay={5} label="Caja este mes" value="$ 2.115.600,00" valueSize={40} icon="wallet" tone="success" glow={g2} sub="Ingresos menos egresos" style={{ padding: '18px 22px' }} />
          <Kpi delay={8} label="Por cobrar" value="$ 1.284.500,00" valueSize={40} icon="file" tone="warning" sub="Facturas pendientes" style={{ padding: '18px 22px' }} />
          <Kpi delay={11} label="Stock crítico" value="3" valueSize={40} icon="alert" tone="danger" sub="Productos bajo mínimo" style={{ padding: '18px 22px' }} />
        </div>
        <Panel style={{ marginTop: 20, padding: '20px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>Ventas · últimos 30 días</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.green }}>↑ 12 %</div>
          </div>
          <svg width={CW} height={CH + 10} style={{ marginTop: 14, display: 'block' }}>
            {[0.25, 0.5, 0.75].map((y) => (
              <line key={y} x1={0} x2={CW} y1={CH * y} y2={CH * y} stroke="#e2e8f0" strokeWidth={2} />
            ))}
            <g style={{ clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }}>
              {SALES.map((v, i) => (
                <rect key={i} x={i * bw + 4} y={CH - (v / max) * (CH - 20)} width={bw - 8} height={(v / max) * (CH - 20)} rx={5} fill="rgba(0,107,67,0.18)" />
              ))}
              <path d={line} stroke={C.primary} strokeWidth={5} fill="none" strokeLinejoin="round" />
            </g>
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700, color: C.muted, marginTop: 6 }}>
            <span>13/9</span>
            <span>28/9</span>
            <span>13/10</span>
          </div>
        </Panel>
      </AppWindow>
    </AbsoluteFill>
  );
};
