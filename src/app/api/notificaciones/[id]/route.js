import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const updated = await db.notificacion.update({
      where: { id },
      data: { leida: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Notificación no encontrada' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.notificacion.delete({ where: { id } });
    return NextResponse.json({ message: 'Eliminada' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Notificación no encontrada' });
  }
}
