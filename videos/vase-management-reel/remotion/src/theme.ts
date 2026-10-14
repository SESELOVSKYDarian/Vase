import { loadFont as loadManrope } from '@remotion/google-fonts/Manrope';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';
import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';

// Tipografias reales de apps/vase-management (app/layout.tsx): Manrope (sans), Newsreader (display), IBM Plex Mono.
export const FONT = loadManrope('normal', { weights: ['500', '600', '700', '800'], subsets: ['latin'] }).fontFamily;
export const SERIF = loadNewsreader('normal', { weights: ['500', '600'], subsets: ['latin'] }).fontFamily;
export const MONO = loadMono('normal', { weights: ['500', '600'], subsets: ['latin'] }).fontFamily;

// Paleta de Vase Management (styles/globals.css + tailwind.config.js).
// Labs = carbon/jade/salvia; Management = tinta azulada + esmeralda/menta sobre pizarra clara.
export const C = {
  ink: '#0d1118', // --sidebar-background 216 28% 7%
  ink2: '#161c25', // --sidebar-accent
  inkLine: '#252c36', // --sidebar-border
  bg: '#f6f8fb', // --background 210 40% 98%
  card: '#ffffff',
  surface: '#eef2f6', // --secondary / --muted
  border: '#d9e1ea', // --border 214 32% 88%
  fg: '#0f172a', // --foreground 222 47% 11%
  muted: '#475569', // --muted-foreground
  primary: '#006b43', // --primary 157 100% 21%
  mint: '#4fe0a8', // --sidebar-primary 157 70% 58%
  brand: '#18c37e', // brand-500
  accent: '#e3f4ec', // --accent 151 38% 92%
  green: '#16a34a', // vase-green
  greenSoft: '#dcfce7',
  red: '#c41f1f', // --destructive 0 72% 43%
  redSoft: '#fde8e8',
  amber: '#b45309',
  amberSoft: '#fdf0dc',
  orange: '#c2410c',
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
