import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

// GET /api/movimientos - Obtiene los últimos movimientos
export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`movimientos:${ip}`, 60);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
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
    logApiError(error, 'GET /api/movimientos');
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
