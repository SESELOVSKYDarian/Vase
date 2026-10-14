import React from 'react';
import { CalculateMetadataFunction, Composition } from 'remotion';
import { Bandeja, ClipProps, Conocimiento, Noche, Pedido, Respuesta, Senales, Visto } from './clips';
import { FPS, HEIGHT, WIDTH } from './theme';
import { Portada } from './Portada';

const meta: CalculateMetadataFunction<ClipProps> = ({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.dur)) });
const CLIPS = { Visto, Noche, Bandeja, Respuesta, Conocimiento, Senales, Pedido } as const;

export const Root: React.FC = () => (
  <>
    {Object.entries(CLIPS).map(([id, Comp]) => (
      <Composition
        key={id}
        id={id}
        component={Comp as React.FC<ClipProps>}
        durationInFrames={60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ dur: 60, ev: {} } as ClipProps}
        calculateMetadata={meta}
      />
    ))}
    <Composition id="Portada" component={Portada} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
