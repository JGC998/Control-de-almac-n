import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export async function GET() {
  try {
    const familias = await db.familia.findMany({
      include: { subfamilias: { orderBy: { nombre: 'asc' } } },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(familias);
  } catch (error) {
    logApiError(error, 'GET /api/familias');
    return NextResponse.json({ message: 'Error al obtener familias' }, { status: 500 });
  }
}
