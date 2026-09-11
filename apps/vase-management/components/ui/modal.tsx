"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, description, children = null, footer, size = "md" }: ModalProps) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-modal-content] input, [data-modal-content] select, [data-modal-content] textarea, [data-modal-content] button")
        ?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.975, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.985, y: reduceMotion ? 0 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            ref={dialogRef}
            className={`relative z-10 w-full ${sizeMap[size]} max-h-[92dvh] overflow-hidden rounded-t-2xl border border-border bg-card shadow-[0_28px_80px_-32px_rgba(15,23,42,.55)] sm:rounded-2xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 id="modal-title" className="text-base font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div data-modal-content className="max-h-[68dvh] overflow-y-auto p-5 sm:max-h-[70vh]">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

