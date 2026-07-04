// middleware.ts
// Protección de rutas — corre en Edge Runtime.
// IMPORTANTE: usa NextAuth inicializado con lib/auth.config.ts (edge-safe),
// NUNCA con lib/auth.ts (que importa bcryptjs + Prisma Client, incompatibles
// con Edge Runtime). Ver lib/auth.config.ts para el detalle de por qué.

import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password']
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  if (!isAuthenticated && !isPublicPath && pathname !== '/') {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isAuthenticated ? '/dashboard' : '/auth/login', req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|images|icons).*)',
  ],
}
