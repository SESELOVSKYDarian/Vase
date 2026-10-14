import { loadFont } from '@remotion/google-fonts/SpaceGrotesk';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '700'], subsets: ['latin'] });
export const FONT = fontFamily;

// Paleta de Vase Labs (apps/vase-labs/app/globals.css) + colores de canal.
export const C = {
  carbon: '#000202',
  ink: '#0d1117',
  graphite: '#2f3030',
  jade: '#3b633d',
  sage: '#739374',
  glow: '#a8e6a9',
  mist: '#eff3f4',
  white: '#ffffff',
  muted: '#8a9690',
  wa: '#25d366',
  ig: '#d84973',
  fb: '#2563eb',
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// 120 BPM: un compás = 2 s = 60 cuadros. Cada corte cae en un compás (ver scripts/musica.mjs).
export const BAR = 60;
export const CUTS = {
  hook: 0,
  brand: 4 * FPS,
  inbox: 8 * FPS,
  ai: 12 * FPS,
  knowledge: 16 * FPS,
  signals: 20 * FPS,
  orders: 24 * FPS,
  cta: 28 * FPS,
  end: 33 * FPS,
};
