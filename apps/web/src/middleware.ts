import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware — Server-side route protection
 *
 * Reads the `auth_token` cookie (mirrored from localStorage on client)
 * to enforce authentication and role-based access on the Edge.
 *
 * This does NOT replace client-side auth — it's a defense-in-depth layer
 * that prevents unauthenticated users from even loading dashboard pages.
 */

// Decode JWT payload without verification (middleware can't verify signatures)
// The actual token verification happens on the API side with every request.
function decodeJWTPayload(token: string): { user_id?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Route → allowed roles mapping
const ROLE_ROUTES: Record<string, string[]> = {
  '/artist': ['artist'],
  '/client': ['client', 'event_company'],
  '/agent': ['agent'],
  '/admin': ['admin'],
};

// Routes that require authentication (any role)
const AUTH_REQUIRED_PREFIXES = [
  '/artist',
  '/client',
  '/agent',
  '/admin',
  '/notifications',
  '/settings',
  '/gigs',
  '/voice',
];

// Routes that should redirect authenticated users away (login/verify)
const AUTH_REDIRECT_PREFIXES = ['/login', '/verify'];

function getRoleHome(role: string): string {
  switch (role) {
    case 'artist': return '/artist';
    case 'client':
    case 'event_company': return '/client';
    case 'agent': return '/agent';
    case 'admin': return '/admin';
    default: return '/';
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ─── Security Headers ───
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  // ─── Read auth token from cookie ───
  const token = request.cookies.get('auth_token')?.value;
  const payload = token ? decodeJWTPayload(token) : null;

  // Check if token is expired
  const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : true;
  const isAuthenticated = !!payload?.user_id && !!payload?.role && !isExpired;
  const userRole = payload?.role;

  // ─── Redirect authenticated users away from login/verify ───
  if (isAuthenticated && userRole) {
    for (const prefix of AUTH_REDIRECT_PREFIXES) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        const home = getRoleHome(userRole);
        return NextResponse.redirect(new URL(home, request.url));
      }
    }
  }

  // ─── Protect dashboard routes ───
  for (const prefix of AUTH_REQUIRED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      // Not authenticated → redirect to login with return URL
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check role-based access
      for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
        if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
          if (userRole && !allowedRoles.includes(userRole)) {
            // Wrong role → redirect to their own dashboard
            const home = getRoleHome(userRole);
            return NextResponse.redirect(new URL(home, request.url));
          }
          break;
        }
      }

      break;
    }
  }

  return response;
}

// Only run middleware on app routes (skip static files, API routes, Next.js internals)
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     * - monitoring (Sentry tunnel)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$|monitoring).*)',
  ],
};
