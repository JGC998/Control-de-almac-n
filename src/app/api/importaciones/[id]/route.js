import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

// DELETE /api/importaciones/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.importacionContenedor.delete({ where: { id } });
    return NextResponse.json({ message: 'Importación eliminada' });
  } catch (error) {
    logApiError(error, 'DELETE /api/importaciones/[id]');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar la importación' }, { status: 500 });
  }
}

// GET /api/importaciones/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const imp = await db.importacionContenedor.findUnique({ where: { id } });
    if (!imp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(imp);
  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]');
    return NextResponse.json({ error: 'Error al obtener la importación' }, { status: 500 });
  }
}
