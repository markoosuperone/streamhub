import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { AUTH_COOKIES } from './app/features/auth/constant';
import { protectedRoutes, publicRoutes, ROUTES } from './app/shared/routes';

export const proxy = async (req: NextRequest) => {
  const path = req.nextUrl.pathname;
  // Prefix match rather than exact, so a future subroute (/library/:id) is
  // gated by default instead of silently falling through unprotected. The
  // home route is exact — as a prefix, '/' would match everything.
  const matches = (route: string) =>
    route === ROUTES.home ? path === route : path === route || path.startsWith(`${route}/`);
  const isProtectedRoute = protectedRoutes.some(matches);
  const isPublicRoute = publicRoutes.some(matches);

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(AUTH_COOKIES.refreshToken)?.value;
  if (!refreshToken && isProtectedRoute) {
    return NextResponse.redirect(new URL(ROUTES.auth, req.url));
  }
  if (refreshToken && isPublicRoute) {
    return NextResponse.redirect(new URL(ROUTES.home, req.url));
  }
  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
