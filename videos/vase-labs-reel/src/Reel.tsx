import React from 'react';
import { AbsoluteFill, Audio, Sequence, getStaticFiles, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Answer, Brand, Cta, Hook, Inbox, Knowledge, Orders, Signals } from './scenes';
import { C, CUTS } from './theme';

const ORDER = [
  ['hook', Hook],
  ['brand', Brand],
  ['inbox', Inbox],
  ['ai', Answer],
  ['knowledge', Knowledge],
  ['signals', Signals],
  ['orders', Orders],
  ['cta', Cta],
] as const;
const STARTS = ORDER.map(([id]) => CUTS[id]);
export const REEL_FRAMES = CUTS.end;

// Destello corto en cada corte (cae sobre el golpe de la musica).
const CutFlash: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.min(...STARTS.slice(1).map((s) => Math.abs(frame - s)));
  const o = interpolate(d, [0, 4], [0.5, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: C.glow, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none' }} />;
};

export const Reel: React.FC = () => (
  <AbsoluteFill style={{ background: C.carbon }}>
    {ORDER.map(([id, Scene], i) => {
      const from = STARTS[i];
      const to = i + 1 < STARTS.length ? STARTS[i + 1] : CUTS.end;
      return (
        <Sequence key={id} from={from} durationInFrames={to - from}>
          <Scene />
        </Sequence>
      );
    })}
    <CutFlash />
    {getStaticFiles().some((f) => f.name === 'musica.wav') ? <Audio src={staticFile('musica.wav')} /> : null}
  </AbsoluteFill>
);
