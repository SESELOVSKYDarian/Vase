import React from 'react';
import { Composition } from 'remotion';
import { Reel, REEL_FRAMES } from './Reel';
import { FPS, HEIGHT, WIDTH } from './theme';

export const Root: React.FC = () => (
  <Composition id="VaseLabsReel" component={Reel} durationInFrames={REEL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
