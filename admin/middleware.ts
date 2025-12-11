import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { ROUTES } from './lib/constants';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL(ROUTES.DASHBOARD, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth');

        // Allow access to auth pages without token
        if (isAuthPage) {
          return true;
        }

        // Require token for protected pages
        return !!token;
      },
    },
    pages: {
      signIn: ROUTES.LOGIN,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/employees/:path*',
    '/attendance/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
