// app/dashboard/multiempresa/page.tsx
import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MultiempresaPanel } from '@/components/modules/multiempresa/MultiempresaPanel'

export const metadata: Metadata = { title: 'Mi Empresa' }

async function getCompanyData(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      branches: {
        include: { pointsOfSale: { orderBy: { number: 'asc' } } },
        orderBy: { isMain: 'desc' },
      },
      companyUsers: {
        include: { user: { select: { id: true, name: true, email: true } }, role: { select: { name: true } } },
        where: { isActive: true },
      },
      _count: { select: { customers: true, products: true, sales: true } },
    },
  })

  return company && {
    ...company,
    pointsOfSale: company.branches.flatMap((branch) => branch.pointsOfSale),
  }
}

export default async function MultiempresaPage() {
  const session = await auth()
  if (!session?.user?.companyId) return null

  const company = await getCompanyData(session.user.companyId)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Empresa</h1>
          <p className="page-subtitle">Configuración, sucursales y usuarios</p>
        </div>
      </div>
      <MultiempresaPanel company={company} />
    </div>
  )
}
