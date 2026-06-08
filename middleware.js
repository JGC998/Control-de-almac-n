import { NextResponse } from 'next/server';
import crypto from 'crypto';

// SEC-05: headers de seguridad completos en todas las respuestas
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

// Rutas que no requieren autenticación aunque AUTH_PIN esté activo
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/status', '/api/auth/logout'];

// SEC-01: verificar cookie de sesión cuando AUTH_PIN está configurado
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  const authPin = process.env.AUTH_PIN;
  if (authPin && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('crm-auth')?.value;
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const expected = crypto.createHmac('sha256', secret).update(authPin).digest('hex');
    const valid = token.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!valid) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
