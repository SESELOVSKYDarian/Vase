import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route protection middleware.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /superadm routes
  if (pathname.startsWith('/superadm')) {
    if (pathname === '/superadm/login') {
      return NextResponse.next();
    }

    // Check for superadm session
    const superadmSession = request.cookies.get('superadm_session');
    if (!superadmSession) {
      const loginUrl = new URL('/superadm/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('noctua-auth');

    if (authCookie) {
      try {
        const authData = JSON.parse(authCookie.value);
        if (authData?.state?.isAuthenticated) {
          return NextResponse.next();
        }
      } catch {
        // Invalid cookie
      }
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/superadm/:path*'],
};
