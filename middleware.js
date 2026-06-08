import { NextResponse } from 'next/server';

// S1/S2 — Autenticación por PIN configurado en AUTH_PIN (env).
// CRÍTICO: En producción, AUTH_PIN es obligatorio. Sin él, el servidor devuelve 503.
// SEC-02: El token de sesión es HMAC-SHA256 del PIN — nunca se almacena el PIN en texto claro.
// Usa Web Crypto API (subtleCrypto) porque middleware corre en Edge Runtime (sin Node.js built-ins).

function addSecurityHeaders(response) {
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

async function derivarToken(pin) {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(pin)));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const MOBILE_UA = /Mobi|Android|iPhone|iPad|Tablet/i;

function isMobile(request) {
  return MOBILE_UA.test(request.headers.get('user-agent') ?? '');
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' && isMobile(request)) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  const pin = process.env.AUTH_PIN;

  // CRÍTICO-01: En producción, AUTH_PIN es obligatorio.
  if (!pin) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        JSON.stringify({ message: 'Servidor no configurado correctamente. Contacte al administrador.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return addSecurityHeaders(NextResponse.next());
  }

  const session = request.cookies.get('crm-auth')?.value;
  const tokenEsperado = await derivarToken(pin);

  if (session === tokenEsperado) return addSecurityHeaders(NextResponse.next());

  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ message: 'Sesión requerida. Accede a /login.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login$|login\\?|api/auth/).*)'],
};
