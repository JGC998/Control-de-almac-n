import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// S1/S2 — Autenticación por PIN configurado en AUTH_PIN (env).
// CRÍTICO: En producción, AUTH_PIN es obligatorio. Sin él, el servidor devuelve 503.

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

// SEC-02: Deriva un token opaco del PIN usando HMAC-SHA256 con SESSION_SECRET.
// La cookie nunca almacena el PIN en texto claro.
function derivarToken(pin) {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  return createHmac('sha256', secret).update(String(pin)).digest('hex');
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

  // CRÍTICO-01: En producción, AUTH_PIN es obligatorio.
  // Sin él toda la app quedaría expuesta — bloqueamos con 503 en lugar de permitir acceso libre.
  if (!pin) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        JSON.stringify({ message: 'Servidor no configurado correctamente. Contacte al administrador.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // En desarrollo, permitir sin PIN (comportamiento original)
    return addSecurityHeaders(NextResponse.next());
  }

  const session = request.cookies.get('crm-auth')?.value;
  const tokenEsperado = derivarToken(pin);

  // SEC-02: Comparar token HMAC, no el PIN en texto claro
  if (session === tokenEsperado) return addSecurityHeaders(NextResponse.next());

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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login$|login\\?|api/auth/).*)'],
};
