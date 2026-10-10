import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '700', '800', '900'],
  subsets: ['latin'],
});

export const FONT = fontFamily;

// Paleta de marca Vase (verde profundo + verde neon del portal).
export const C = {
  ink: '#06140d',
  deep: '#0b2418',
  brand: '#006d43',
  neon: '#47e098',
  mint: '#bbf5d6',
  paper: '#f8faf8',
  line: '#dfe2eb',
  muted: '#7d8b83',
  warn: '#ffb547',
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
