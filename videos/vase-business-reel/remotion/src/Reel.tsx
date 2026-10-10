import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, getStaticFiles, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { Brand, Catalog, Checkout, Dashboard, Domain, Editor, Hook, Pricing, RealPanel } from './scenes';
import { Backdrop, useSpring } from './ui';
import { C, FONT } from './theme';

export const WHATSAPP = '+54 9 223 449-6403';
const HF_CTA = 'cta-hyperframes.mp4';

// Duraciones en frames (30 fps).
export const SCENES = [
  { id: 'hook', frames: 95, C: Hook },
  { id: 'brand', frames: 85, C: Brand },
  { id: 'editor', frames: 150, C: Editor },
  { id: 'catalog', frames: 120, C: Catalog },
  { id: 'pricing', frames: 115, C: Pricing },
  { id: 'checkout', frames: 115, C: Checkout },
  { id: 'dashboard', frames: 125, C: Dashboard },
  { id: 'domain', frames: 100, C: Domain },
  { id: 'real', frames: 80, C: RealPanel },
] as const;
export const CTA_FRAMES = 150;
const T = 12;
const TRANSITIONS = [wipe({ direction: 'from-bottom' }), slide({ direction: 'from-right' }), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), wipe({ direction: 'from-bottom' }), slide({ direction: 'from-left' }), fade(), fade()];

export const REEL_FRAMES =
  SCENES.reduce((acc, s) => acc + s.frames, 0) + CTA_FRAMES - T * SCENES.length;

const hasHyperframesCta = () => getStaticFiles().some((f) => f.name === HF_CTA);

export const Reel: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <TransitionSeries>
      {SCENES.map((s, i) => (
        <React.Fragment key={s.id}>
          <TransitionSeries.Sequence durationInFrames={s.frames}>
            <s.C />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={TRANSITIONS[i] as never} timing={linearTiming({ durationInFrames: T })} />
        </React.Fragment>
      ))}
      <TransitionSeries.Sequence durationInFrames={CTA_FRAMES}>
        {hasHyperframesCta() ? <OffthreadVideo src={staticFile(HF_CTA)} muted /> : <Cta />}
      </TransitionSeries.Sequence>
    </TransitionSeries>
    {getStaticFiles().some((f) => f.name === 'music.mp3') ? <Music /> : null}
  </AbsoluteFill>
);

const Music: React.FC = () => {
  // Pista opcional: dejá public/music.mp3 y se mezcla sola con fade-out final.
  return <Audio src={staticFile('music.mp3')} volume={(f: number) => interpolate(f, [REEL_FRAMES - 30, REEL_FRAMES], [0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />;
};

// Cierre de respaldo (si no esta el clip de HyperFrames).
export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const a = useSpring(0, 12);
  const b = useSpring(10, 12);
  const c = useSpring(22, 10);
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: 'center' }}>
      <Backdrop />
      <Img src={staticFile('vase-logo.png')} style={{ position: 'absolute', top: 260, width: 200, filter: 'invert(1) brightness(2)', opacity: a }} />
      <div style={{ position: 'absolute', top: 560, left: 80, right: 80, textAlign: 'center', color: C.paper, fontSize: 120, fontWeight: 900, letterSpacing: -4, lineHeight: 1, transform: `translateY(${(1 - a) * 80}px)`, opacity: a }}>
        Tu negocio,<br /><span style={{ color: C.neon }}>online en días.</span>
      </div>
      <div style={{ position: 'absolute', top: 900, left: 100, right: 100, textAlign: 'center', color: C.mint, fontSize: 48, fontWeight: 600, opacity: b }}>
        Escribinos y te mostramos Vase Business con tu marca.
      </div>
      <div style={{ position: 'absolute', top: 1120, padding: '36px 60px', borderRadius: 999, background: C.neon, color: C.ink, fontSize: 56, fontWeight: 900, transform: `scale(${c * pulse})` }}>
        💬 {WHATSAPP}
      </div>
      <div style={{ position: 'absolute', top: 1310, color: C.paper, fontSize: 48, fontWeight: 800, opacity: c }}>vase.ar</div>
    </AbsoluteFill>
  );
};
