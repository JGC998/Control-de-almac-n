import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/movimientos - Obtiene los últimos movimientos
export async function GET() {
  try {
    const movimientos = await db.movimientoStock.findMany({
      orderBy: { fecha: 'desc' },
      take: 50, // Limita a los últimos 50
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
