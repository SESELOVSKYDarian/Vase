// app/dashboard/super-admin/page.tsx
//
// Server Component: resuelve la sesión server-side (mismo patrón que
// app/dashboard/layout.tsx) y redirige ANTES de renderizar nada si el
// usuario no es super admin — evita el flash de contenido que tendría
// un guard puramente client-side. La seguridad real y vinculante sigue
// viviendo en requireSuperAdmin() dentro de cada endpoint /api/super-admin/*;
// este redirect es solo UX.

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SuperAdminDashboard } from '@/components/modules/super-admin/SuperAdminDashboard'

export default async function SuperAdminPage() {
  const session = await auth()
  if (!session?.user?.isSuperAdmin) redirect('/dashboard')

  return <SuperAdminDashboard />
}
