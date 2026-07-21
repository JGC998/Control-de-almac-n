import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function POST(request) {
  try {
    // Rate limit: 5 intentos/min por IP (brute force protection)
    const ip = getClientIp(request);
    const rl = checkRateLimit(ip, 5);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Demasiados intentos. Espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { pin } = await request.json();
    const expected = process.env.AUTH_PIN;

    // Comparación en tiempo constante para evitar timing attacks
    if (expected) {
      const pinBuf = Buffer.from(String(pin).padEnd(expected.length).slice(0, expected.length));
      const expBuf = Buffer.from(expected);
      const valid = pinBuf.length === expBuf.length && crypto.timingSafeEqual(pinBuf, expBuf);
      if (!valid) {
        return NextResponse.json({ message: 'PIN incorrecto' }, { status: 401 });
      }
    }

    const secret = process.env.SESSION_SECRET;
    const authEnabled = !!process.env.AUTH_PIN;
    if (!secret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
    }
    if (!secret && authEnabled && process.env.NODE_ENV !== 'production') {
      console.warn('[AUTH] SESSION_SECRET no configurado; usando secret de desarrollo');
    }
    const effectiveSecret = secret || 'dev-secret-change-in-production';
    const token = crypto.createHmac('sha256', effectiveSecret).update(expected ?? 'no-pin').digest('hex');

    const res = NextResponse.json({ ok: true });
    res.cookies.set('crm-auth', token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 28800, // 8 horas
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ message: 'Error en el inicio de sesión' }, { status: 500 });
  }
}
