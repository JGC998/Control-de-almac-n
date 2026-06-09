import { NextResponse } from 'next/server';

function addSecurityHeaders(response) {
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

const MOBILE_UA = /Mobi|Android|iPhone|iPad|Tablet/i;

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Redirigir móviles/tablets a /tablet si acceden a la raíz
  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|logo-crm\\.png).*)'],
};
