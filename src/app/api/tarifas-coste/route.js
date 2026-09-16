import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tarifas-coste
export async function GET() {
  try {
    const tarifas = await db.tarifaCoste.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    logApiError(error, 'GET /api/tarifas-coste');
    return NextResponse.json({ error: 'Error al obtener tarifas de coste' }, { status: 500 });
  }
}
