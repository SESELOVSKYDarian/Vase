'use client'

import { AnimatePresence, m } from 'motion/react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={routeKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  )
}
