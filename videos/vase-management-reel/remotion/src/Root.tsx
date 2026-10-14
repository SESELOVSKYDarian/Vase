import React from 'react';
import { CalculateMetadataFunction, Composition } from 'remotion';
import { ClipProps, Pedidos, Reponer, Riesgo, Tablero, Venta } from './clips';
import { FPS, HEIGHT, WIDTH } from './theme';
import { Portada } from './Portada';

const meta: CalculateMetadataFunction<ClipProps> = ({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.dur)) });
const CLIPS = { Venta, Reponer, Pedidos, Riesgo, Tablero } as const;

export const Root: React.FC = () => (
  <>
    {Object.entries(CLIPS).map(([id, Comp]) => (
      <Composition
        key={id}
        id={id}
        component={Comp as React.FC<ClipProps>}
        durationInFrames={150}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ dur: 150, ev: {} } as ClipProps}
        calculateMetadata={meta}
      />
    ))}
    <Composition id="Portada" component={Portada} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
