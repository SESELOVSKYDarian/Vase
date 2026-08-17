// app/dashboard/layout.tsx
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/ui/PageTransition'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.error === "MANAGEMENT_NOT_ENTITLED") {
    redirect("/auth/access-denied")
  }
  if (!session?.user) {
    const requestHeaders = headers()
    const tenantSlug = requestHeaders.get("x-vase-tenant-slug")?.trim() || undefined
    const managementUrl = new URL(
      '/dashboard',
      process.env.NEXT_PUBLIC_APP_URL || 'https://management.vase.ar',
    )
    if (tenantSlug) managementUrl.searchParams.set('tenant', tenantSlug)

    const signInUrl = new URL(
      '/signin',
      process.env.VASE_APP_PUBLIC_URL || 'https://app.vase.ar',
    )
    signInUrl.searchParams.set('redirectTo', managementUrl.toString())
    redirect(signInUrl.toString())
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar user={session.user} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={session.user} />
        <main className="dashboard-canvas flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-[1600px] p-4 pb-10 md:p-6 md:pb-12 lg:p-8 lg:pb-16">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
