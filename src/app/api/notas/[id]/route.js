import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

// BUG-06: DELETE con ID en la URL (estándar REST) en lugar de en el body
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.nota.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ message: 'Nota eliminada' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Nota no encontrada' });
  }
}
