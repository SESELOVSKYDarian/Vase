// lib/auth.ts
// Configuración COMPLETA de Auth.js v5 — Node runtime únicamente.
// Importa bcryptjs y Prisma Client: NUNCA debe ser importado desde
// middleware.ts ni desde ningún archivo que pueda terminar en Edge Runtime.
// Para el middleware, usar lib/auth.config.ts (edge-safe).

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { verifyManagementSsoTicket } from '@vase/internal-api'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authConfig } from '@/lib/auth.config'
import { unstable_noStore as noStore } from 'next/cache'
import { provisionPlatformIdentity } from '@/lib/platform-sso'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      id: 'vase-sso',
      name: 'Vase SSO',
      credentials: { ticket: { label: 'Ticket', type: 'text' } },
      async authorize(credentials) {
        if (typeof credentials?.ticket !== 'string') return null
        const claims = verifyManagementSsoTicket(credentials.ticket, process.env.MANAGEMENT_SSO_SECRET ?? '')
        const user = await provisionPlatformIdentity(claims)
        return { id: user.id, name: user.name, email: user.email, isSuperAdmin: false, companyId: user.companyId, companyName: user.companyName, roleId: user.roleId, roleName: user.roleName }
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            companyUsers: {
              include: { company: true, role: true },
              where: { isActive: true },
            },
          },
        })

        if (!user || !user.password || !user.isActive) return null

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) return null

        const primaryCompanyUser = user.companyUsers[0]

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isSuperAdmin: user.isSuperAdmin,
          companyId: primaryCompanyUser?.companyId || null,
          companyName: primaryCompanyUser?.company?.name || null,
          roleId: primaryCompanyUser?.roleId || null,
          roleName: primaryCompanyUser?.role?.name || null,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isSuperAdmin = (user as any).isSuperAdmin
        token.companyId = (user as any).companyId
        token.companyName = (user as any).companyName
        token.roleId = (user as any).roleId
        token.roleName = (user as any).roleName
      }
      return token
    },
  },
})

export const { handlers, signIn, signOut } = nextAuth

export async function auth() {
  noStore()
  return nextAuth.auth()
}
