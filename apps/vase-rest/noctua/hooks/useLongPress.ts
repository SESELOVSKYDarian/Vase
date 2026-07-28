// Detecta long press táctil y de mouse; cancela si el dedo se mueve más de moveThreshold px.
'use client';

import { useRef, useCallback, useEffect } from 'react';

interface LongPressConfig {
  threshold?: number;
  moveThreshold?: number;
}

export interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  /** true si el último evento fue un long press (útil para suprimir el tap subsiguiente) */
  didFireRef: React.MutableRefObject<boolean>;
}

export function useLongPress(
  onLongPress: (x: number, y: number) => void,
  { threshold = 500, moveThreshold = 5 }: LongPressConfig = {}
): LongPressHandlers {
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos    = useRef<{ x: number; y: number } | null>(null);
  const didFireRef  = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback((x: number, y: number) => {
    clear();
    startPos.current  = { x, y };
    didFireRef.current = false;
    timerRef.current  = setTimeout(() => {
      didFireRef.current = true;
      timerRef.current   = null;
      onLongPress(x, y);
    }, threshold);
  }, [clear, onLongPress, threshold]);

  const checkMove = useCallback((x: number, y: number) => {
    if (!startPos.current) return;
    if (Math.abs(x - startPos.current.x) > moveThreshold ||
        Math.abs(y - startPos.current.y) > moveThreshold) {
      clear();
    }
  }, [clear, moveThreshold]);

  // Limpiar al desmontar para evitar memory leaks
  useEffect(() => clear, [clear]);

  return {
    onTouchStart: (e) => start(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove:  (e) => checkMove(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd:   clear,
    onMouseDown:  (e) => start(e.clientX, e.clientY),
    onMouseMove:  (e) => checkMove(e.clientX, e.clientY),
    onMouseUp:    clear,
    didFireRef,
  };
}
