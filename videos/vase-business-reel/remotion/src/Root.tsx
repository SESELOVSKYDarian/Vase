import React from 'react';
import { Composition } from 'remotion';
import { Reel, REEL_FRAMES, Cta, CTA_FRAMES } from './Reel';
import { FPS, HEIGHT, WIDTH } from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="VaseBusinessReel" component={Reel} durationInFrames={REEL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="CtaRemotion" component={Cta} durationInFrames={CTA_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
