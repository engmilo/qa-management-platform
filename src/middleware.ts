import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protected routes
  const protectedRoutes = ['/dashboard', '/projects', '/requirements', '/test-cases'];
  
  // Auth routes
  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  
  // Check if path is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuth = authRoutes.some(route => pathname.startsWith(route));
  
  // For now, simulate auth check
  // In production, check session cookie here
  const isAuthenticated = false; // Replace with actual auth check
  
  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  if (isAuthenticated && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
