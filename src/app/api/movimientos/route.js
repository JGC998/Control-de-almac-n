import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';



// GET /api/movimientos - Obtiene los últimos movimientos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    const whereClause = {};
    if (stockId) {
      whereClause.stockId = stockId;
    }

    const limitParam = searchParams.get('limit');
    const take = Math.min(parseInt(limitParam || '100', 10), 500);

    const movimientos = await db.movimientoStock.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
      take,
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
