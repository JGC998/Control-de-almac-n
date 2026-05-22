import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pin } = await request.json();
    const expected = process.env.AUTH_PIN;

    if (expected && pin !== expected) {
      return NextResponse.json({ message: 'PIN incorrecto' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('crm-auth', expected || '', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 28800, // 8 horas
    });
    return res;
  } catch {
    return NextResponse.json({ message: 'Error en el inicio de sesión' }, { status: 500 });
  }
}
