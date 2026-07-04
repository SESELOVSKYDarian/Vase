// types/next-auth.d.ts
// Extensión de tipos de NextAuth para incluir datos del usuario de Vase

import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isSuperAdmin: boolean
      companyId: string | null
      companyName: string | null
      branchId: string | null
      roleId: string | null
      roleName: string | null
    }
  }

  interface User {
    isSuperAdmin?: boolean
    companyId?: string | null
    companyName?: string | null
    branchId?: string | null
    roleId?: string | null
    roleName?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isSuperAdmin?: boolean
    companyId?: string | null
    companyName?: string | null
    branchId?: string | null
    roleId?: string | null
    roleName?: string | null
  }
}
