// Portada del reel (1080x1920). Lo importante queda dentro del recorte 4:5 del feed (1080x1350 centrado).
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT } from './theme';
import { Backdrop } from './ui';

export const Portada: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: FONT }}>
    <Backdrop />
    <AbsoluteFill style={{ background: 'radial-gradient(700px 600px at 50% 62%, rgba(255,59,59,0.18), transparent 70%)' }} />
    <div style={{ position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center' }}>
      <Img src={staticFile('vase-logo.png')} style={{ width: 110, filter: 'invert(1) brightness(2)' }} />
      <div style={{ color: C.mist, fontSize: 40, fontWeight: 700, letterSpacing: 6, marginTop: 10 }}>
        VASE <span style={{ color: C.glow }}>LABS</span>
      </div>
    </div>
    <div style={{ position: 'absolute', top: 540, left: 60, right: 60, textAlign: 'center', color: '#fff', fontSize: 118, fontWeight: 700, lineHeight: 0.98, letterSpacing: -4 }}>
      ¿Quién le contesta a tus clientes a las <span style={{ color: C.glow }}>3&nbsp;AM?</span>
    </div>
    {/* chat en visto */}
    <div style={{ position: 'absolute', top: 1040, left: 170, right: 170, borderRadius: 40, background: C.mist, padding: 30, transform: 'rotate(-3deg)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
      {['Hola! ¿Está disponible? 😊', '¿Me pasás precio?', 'Hola??'].map((t) => (
        <div key={t} style={{ display: 'table', background: '#fff', borderRadius: 24, borderBottomLeftRadius: 6, padding: '16px 24px', fontSize: 34, color: C.ink, marginBottom: 14 }}>{t}</div>
      ))}
      <div style={{ textAlign: 'right', color: '#34b7f1', fontSize: 28, fontWeight: 700 }}>✓✓ Visto 03:00</div>
    </div>
    <div style={{ position: 'absolute', top: 1150, left: 0, right: 0, textAlign: 'center', transform: 'rotate(-12deg)' }}>
      <span style={{ display: 'inline-block', padding: '14px 40px', border: '10px solid #ff3b3b', borderRadius: 26, color: '#ff3b3b', fontSize: 104, fontWeight: 700, letterSpacing: 8, background: 'rgba(0,0,0,0.55)' }}>VISTO</span>
    </div>
  </AbsoluteFill>
);
