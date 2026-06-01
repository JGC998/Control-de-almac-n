import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET() {
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
    const { titulo, mensaje, tipo = 'PENDIENTE', url } = await request.json();
    if (!titulo || !mensaje) {
      return NextResponse.json({ message: 'titulo y mensaje requeridos' }, { status: 400 });
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
