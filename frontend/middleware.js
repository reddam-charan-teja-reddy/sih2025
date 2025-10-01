import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get token from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const guestToken = request.cookies.get('guestToken')?.value;

  // Auth status
  const isAuthenticated = Boolean(accessToken || refreshToken);
  const isGuest = Boolean(guestToken) && !isAuthenticated;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify',
    '/unauthorized',
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/guest',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify',
    '/api/auth/refresh',
  ];

  // Guest-allowed routes (now mirror citizen routes)
  const guestAllowedRoutes = [
    '/',
    '/dashboard',
    '/reports',
    '/map',
    '/alerts',
    '/profile',
    '/settings',
    '/submit-report',
  ];

  // Routes that require authentication (guest or full)
  const authRequiredRoutes = [
    '/profile',
    '/settings',
    '/emergency-contacts',
    '/submit-report',
  ];

  // Official-only routes
  const officialOnlyRoutes = [
    '/admin',
    '/verify-reports',
    '/send-alerts',
    '/manage-incidents',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isGuest) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if guest is trying to access auth-required routes
  const isAuthRequired = authRequiredRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Guests are now allowed on auth-required routes

  // Check guest access to allowed routes
  const isGuestAllowed = guestAllowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isGuest && !isGuestAllowed) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // For authenticated users, we'll handle role-based access in the components
  // since we need to decode the JWT to get user role information

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
