import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`notificaciones-get:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  try {
    const notificaciones = await db.notificacion.findMany({
      orderBy: [{ leida: 'asc' }, { creadaEn: 'desc' }],
      take: 50,
    });
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    return NextResponse.json({ notificaciones, noLeidas });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    // SEC-06: rate limit — prevenir flooding de notificaciones
    const ip = getClientIp(request);
    const rl = checkRateLimit(`notificaciones:${ip}`, 30);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Demasiadas peticiones' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }
    const { titulo, mensaje, tipo = 'PENDIENTE', url } = await request.json();
    if (!titulo || titulo.length > 200 || !mensaje || mensaje.length > 1000) {
      return NextResponse.json({ message: 'titulo (max 200) y mensaje (max 1000) requeridos' }, { status: 400 });
    }
    const TIPOS_VALIDOS = ['INFO', 'PENDIENTE', 'ALERTA'];
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ message: 'Tipo de notificación inválido' }, { status: 400 });
    }
    const notif = await db.notificacion.create({
      data: { titulo, mensaje, tipo, url: url || null },
    });
    return NextResponse.json(notif, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PATCH() {
  try {
    await db.notificacion.updateMany({ where: { leida: false }, data: { leida: true } });
    return NextResponse.json({ message: 'Todas marcadas como leídas' });
  } catch (error) {
    return handlePrismaError(error);
  }
}
