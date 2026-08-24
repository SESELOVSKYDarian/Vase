'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, m } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="ui-dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <m.div
                className={cn('ui-dialog-content', className)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="ui-dialog-header">
                  <div>
                    <DialogPrimitive.Title className="ui-dialog-title">{title}</DialogPrimitive.Title>
                    {description && (
                      <DialogPrimitive.Description className="ui-dialog-description">
                        {description}
                      </DialogPrimitive.Description>
                    )}
                  </div>
                  <DialogPrimitive.Close className="ui-icon-button" aria-label="Cerrar diálogo">
                    <X size={18} />
                  </DialogPrimitive.Close>
                </div>
                <div className="ui-dialog-body">{children}</div>
                {footer && <div className="ui-dialog-footer">{footer}</div>}
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

/**
 * Accessible transition wrapper for existing feature panels. It lets legacy
 * forms migrate incrementally without duplicating portal/focus/exit behavior.
 */
export function LegacyDialog({
  open,
  onOpenChange,
  children,
  label = 'Diálogo',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  label?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="ui-dialog-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-label={label}>
              <m.div
                className="fixed inset-0 z-[51] flex items-center justify-center p-4"
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
                {children}
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
