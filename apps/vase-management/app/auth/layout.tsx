import { BrandMark } from '@/components/ui/BrandMark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1117] p-4 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_15%,rgba(24,195,126,.22),transparent_30rem),radial-gradient(circle_at_85%_80%,rgba(71,224,152,.12),transparent_28rem),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:auto,auto,32px_32px,32px_32px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center text-white">
          <BrandMark showName />
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[.96] p-6 text-[#191c1b] shadow-[0_32px_100px_-30px_rgba(0,0,0,.75)] backdrop-blur-2xl dark:bg-[#171c22]/95 dark:text-white sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Vase Management. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
