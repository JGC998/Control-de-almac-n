import { NextResponse } from 'next/server';
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

    const movimientos = await db.movimientoStock.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
      take: stockId ? undefined : 50, // Sin límite si se filtra por ID
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
