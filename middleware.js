import { NextResponse } from 'next/server';

// S1/S2 — Autenticación por PIN configurado en AUTH_PIN (env).
// Si AUTH_PIN no está definido, no se aplica ninguna restricción.

function addSecurityHeaders(response) {
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

const MOBILE_UA = /Mobi|Android|iPhone|iPad|Tablet/i;

function isMobile(request) {
  return MOBILE_UA.test(request.headers.get('user-agent') ?? '');
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Redirigir móviles/tablets a /tablet si acceden a la raíz del CRM
  if (pathname === '/' && isMobile(request)) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  const pin = process.env.AUTH_PIN;
  if (!pin) return addSecurityHeaders(NextResponse.next());

  const session = request.cookies.get('crm-auth')?.value;

  if (session === pin) return addSecurityHeaders(NextResponse.next());

  // API → 401 JSON
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ message: 'Sesión requerida. Accede a /login.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Páginas → redirigir a /login
  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|api/auth).*)'],
};
