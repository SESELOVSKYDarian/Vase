import { cn } from '@/utils'

export function BrandMark({
  className,
  showName = false,
  compact = false,
}: {
  className?: string
  showName?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span className="relative flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[0_10px_30px_-14px_rgba(24,195,126,.8)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vasecolorlogo.ico" alt="" className="h-8 w-8 object-contain" />
      </span>
      {showName && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold tracking-[-.02em] text-current">
            Vase Management
          </span>
          {!compact && (
            <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[.14em] text-current opacity-50">
              Gestión empresarial
            </span>
          )}
        </span>
      )}
    </div>
  )
}
