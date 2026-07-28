import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Install clsx + tailwind-merge for cn helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Argentine Peso string: $ 1.250,00
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format elapsed time from a Date as HH:MM:SS
 */
export function formatElapsed(from: Date): string {
  const diff = Math.floor((Date.now() - from.getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Return elapsed minutes from a Date
 */
export function elapsedMinutes(from: Date): number {
  return Math.floor((Date.now() - from.getTime()) / 60000);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Generate a unique ID (simple UUID v4 subset)
 */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
