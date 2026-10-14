// Portada del reel (1080x1920). Lo importante queda dentro del recorte 4:5 del feed (1080x1350 centrado: y 285–1635).
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT, SERIF } from './theme';

const ALERT = '#ff4d4f';

export const Portada: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT, background: C.ink }}>
    <AbsoluteFill style={{ background: 'radial-gradient(800px 700px at 50% 70%, rgba(255,77,79,0.20), transparent 70%), radial-gradient(900px 700px at 30% 20%, rgba(79,224,168,0.16), transparent 70%)' }} />
    <AbsoluteFill style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
    {/* celda de planilla de fondo: 5 tachado → 0 */}
    <div style={{ position: 'absolute', top: 1180, left: 150, right: 150, borderRadius: 24, background: '#f6f8fb', border: '3px solid #cfd8e3', overflow: 'hidden', transform: 'rotate(-3deg)', boxShadow: '0 40px 100px rgba(0,0,0,0.55)' }}>
      <div style={{ display: 'flex', background: '#e3efe7', fontSize: 30, fontWeight: 700, color: '#3f5c4a' }}>
        <div style={{ flex: 1, padding: '14px 24px', borderRight: '2px solid #cfd8e3' }}>Producto</div>
        <div style={{ width: 230, padding: '14px 24px' }}>Stock</div>
      </div>
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: C.fg, borderTop: '2px solid #cfd8e3' }}>
        <div style={{ flex: 1, padding: '22px 24px', borderRight: '2px solid #cfd8e3' }}>Aceite de girasol 1,5 L</div>
        <div style={{ width: 230, padding: '22px 24px', display: 'flex', gap: 26, alignItems: 'center' }}>
          <span style={{ position: 'relative', color: '#94a3b8' }}>
            5<span style={{ position: 'absolute', left: -8, right: -8, top: '52%', height: 6, background: ALERT, transform: 'rotate(-20deg)' }} />
          </span>
          <span style={{ color: ALERT, fontSize: 56, fontWeight: 800 }}>0</span>
        </div>
      </div>
    </div>
    <div style={{ position: 'absolute', top: 400, left: 70, right: 70, textAlign: 'center', color: '#fff', fontSize: 112, fontWeight: 800, lineHeight: 1.0, letterSpacing: -4 }}>
      Vendiste algo que no <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, letterSpacing: -2 }}>tenías.</span>
    </div>
    <div style={{ position: 'absolute', top: 820, left: 0, right: 0, textAlign: 'center', transform: 'rotate(-6deg)' }}>
      <span style={{ display: 'inline-block', padding: '10px 50px', border: `12px solid ${ALERT}`, borderRadius: 30, color: ALERT, fontSize: 146, fontWeight: 800, letterSpacing: 2, background: 'rgba(13,17,24,0.6)', lineHeight: 1.05 }}>
        OTRA VEZ.
      </span>
    </div>
    <div style={{ position: 'absolute', top: 1500, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <Img src={staticFile('vase-logo.png')} style={{ width: 46, filter: 'invert(1) brightness(2)' }} />
      <span style={{ color: '#e6efe9', fontSize: 38, fontWeight: 800, letterSpacing: 1 }}>
        Vase <span style={{ color: C.mint }}>Management</span>
      </span>
    </div>
  </AbsoluteFill>
);
