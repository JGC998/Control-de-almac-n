import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(request) {
  try {
    // SEC — Rate limit: 5 intentos/min por IP (brute force protection)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1';
    const rl = checkRateLimit(ip, 5);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Demasiados intentos. Espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const { pin } = await request.json();
    const expected = process.env.AUTH_PIN;

    // SEC — Comparación en tiempo constante para evitar timing attacks
    if (expected) {
      const pinBuf = Buffer.from(String(pin).padEnd(expected.length).slice(0, expected.length));
      const expBuf = Buffer.from(expected);
      const valid = pinBuf.length === expBuf.length && crypto.timingSafeEqual(pinBuf, expBuf);
      if (!valid) {
        return NextResponse.json({ message: 'PIN incorrecto' }, { status: 401 });
      }
    }

    // SEC-02: SESSION_SECRET obligatorio en producción
    const secret = process.env.SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
    }
    const effectiveSecret = secret || 'dev-secret-change-in-production';
    const token = crypto.createHmac('sha256', effectiveSecret).update(expected).digest('hex');

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
