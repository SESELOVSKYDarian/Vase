// lib/auth.config.ts
// Configuración SOLO edge-safe de Auth.js — usada por middleware.ts
//
// CRÍTICO: este archivo NO debe importar bcryptjs, @prisma/client, ni el
// adapter de Prisma. El middleware de Next.js corre en Edge Runtime por
// defecto, donde esas dependencias (basadas en APIs de Node) no funcionan.
// Por eso la config completa (con Credentials + bcrypt + Prisma) vive en
// lib/auth.ts y SOLO se usa en API routes / Server Components (Node runtime).
//
// Este archivo define únicamente los callbacks que necesitan correr en el
// middleware para decidir si una ruta requiere auth, sin tocar la base de
// datos ni hashear contraseñas.

import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  session: { strategy: 'jwt' },
  providers: [], // Los providers reales (Credentials) solo se registran en lib/auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = request.nextUrl
      const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/sso']
      const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

      if (pathname === '/') return true // redirect logic se maneja en el middleware
      if (isPublicPath) return true
      return isLoggedIn
    },
    // jwt/session callbacks reales (con companyId, roleId, etc.) están en lib/auth.ts;
    // acá se definen como passthrough para que el tipo sea consistente en el edge.
    async jwt({ token }) {
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
        session.user.companyId = token.companyId as string | null
        session.user.companyName = token.companyName as string | null
        session.user.roleId = token.roleId as string | null
        session.user.roleName = token.roleName as string | null
      }
      return session
    },
  },
}
