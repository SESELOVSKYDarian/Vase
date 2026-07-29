// Capa táctil invisible sobre cada mesa: detecta tap, doble tap, long press y swipe.
'use client';

import { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import type { Mesa } from '@/types/mesa';

// Umbrales de gestos
const TAP_MAX_MS     = 300;
const TAP_MAX_MOVE   = 10;
const DOUBLE_TAP_MS  = 300;
const SWIPE_MIN_X    = 60;
const SWIPE_MAX_Y    = 30;
const TAP_DELAY_MS   = 260; // Espera para detectar doble tap antes de disparar tap simple

interface MesaTouchOverlayProps {
  mesa:            Mesa;
  isMergeMode:     boolean;
  isMergeSelected: boolean;
  /** Mesa no elegible en modo selección: ignora todos los gestos. */
  disabled?:       boolean;
  onTap:           (x: number, y: number) => void;
  onDoubleTap:     () => void;
  onLongPress:     (x: number, y: number) => void;
  onSwipeLeft:     () => void;
  onSwipeRight:    () => void;
}

export function MesaTouchOverlay({
  isMergeMode,
  isMergeSelected,
  disabled = false,
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
}: MesaTouchOverlayProps) {
  const touchStart   = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTime  = useRef<number>(0);
  const tapTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

  const longPress = useLongPress(onLongPress, { threshold: 500, moveThreshold: 5 });

  const clearTapTimer = useCallback(() => {
    if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
  }, []);

  useEffect(() => () => clearTapTimer(), [clearTapTimer]);

  // En modo fusión el tap es inmediato (toggle de selección), sin demora
  const dispatchTap = useCallback((x: number, y: number) => {
    if (isMergeMode) { onTap(x, y); return; }
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_MS) {
      clearTapTimer();
      lastTapTime.current = 0;
      onDoubleTap();
      return;
    }
    lastTapTime.current = now;
    clearTapTimer();
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      onTap(x, y);
    }, TAP_DELAY_MS);
  }, [isMergeMode, clearTapTimer, onTap, onDoubleTap]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    longPress.onTouchStart(e);
  }, [longPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    longPress.onTouchMove(e);
  }, [longPress]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    longPress.onTouchEnd();

    // Si el long press ya disparó, no procesar como tap
    if (longPress.didFireRef.current) {
      longPress.didFireRef.current = false;
      touchStart.current = null;
      return;
    }

    if (!touchStart.current) return;
    const touch    = e.changedTouches[0];
    const dx       = touch.clientX - touchStart.current.x;
    const dy       = Math.abs(touch.clientY - touchStart.current.y);
    const adx      = Math.abs(dx);
    const duration = Date.now() - touchStart.current.time;
    touchStart.current = null;

    // Swipe (en modo fusión se ignora)
    if (!isMergeMode && adx > SWIPE_MIN_X && dy < SWIPE_MAX_Y) {
      e.preventDefault();
      const dir = dx > 0 ? 'right' : 'left';
      setSwipeDir(dir);
      setTimeout(() => setSwipeDir(null), 600);
      if (dir === 'right') onSwipeRight(); else onSwipeLeft();
      return;
    }

    // Tap (movimiento mínimo + duración corta)
    if (adx < TAP_MAX_MOVE && dy < TAP_MAX_MOVE && duration < TAP_MAX_MS) {
      e.preventDefault();
      dispatchTap(touch.clientX, touch.clientY);
    }
  }, [longPress, isMergeMode, onSwipeLeft, onSwipeRight, dispatchTap]);

  // Soporte mouse: long press + click/doble-click
  const handleMouseDown   = useCallback((e: React.MouseEvent) => longPress.onMouseDown(e), [longPress]);
  const handleMouseMove   = useCallback((e: React.MouseEvent) => longPress.onMouseMove(e), [longPress]);
  const handleMouseUp     = useCallback(() => longPress.onMouseUp(), [longPress]);
  const handleClick       = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (longPress.didFireRef.current) { longPress.didFireRef.current = false; return; }
    dispatchTap(e.clientX, e.clientY);
  }, [longPress, dispatchTap]);

  return (
    <>
      {/* Capa táctil — cubre toda el área de la mesa */}
      <div
        className={`absolute inset-0 z-[6] select-none ${disabled ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
        onTouchStart={disabled ? undefined : handleTouchStart}
        onTouchMove={disabled ? undefined : handleTouchMove}
        onTouchEnd={disabled ? undefined : handleTouchEnd}
        onMouseDown={disabled ? undefined : handleMouseDown}
        onMouseMove={disabled ? undefined : handleMouseMove}
        onMouseUp={disabled ? undefined : handleMouseUp}
        onClick={disabled ? undefined : handleClick}
        aria-hidden="true"
      />

      {/* Indicador de dirección de swipe */}
      <AnimatePresence>
        {swipeDir && (
          <motion.div
            key={swipeDir}
            initial={{ opacity: 0, x: swipeDir === 'right' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[7]"
          >
            <span className="text-2xl text-white/70 drop-shadow-lg">
              {swipeDir === 'right' ? '→' : '←'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anillo de selección de fusión */}
      <AnimatePresence>
        {isMergeSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute inset-0 rounded-xl pointer-events-none z-[8]"
            style={{ boxShadow: '0 0 0 3px #d97706, 0 0 16px 2px rgba(217,119,6,0.5)' }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
