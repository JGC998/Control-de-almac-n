import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tarifas-venta-historial?material=PVC&espesor=3
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');
    const espesor  = searchParams.get('espesor') ? parseFloat(searchParams.get('espesor')) : null;

    if (!material || !espesor) {
      return NextResponse.json({ error: 'material y espesor son obligatorios' }, { status: 400 });
    }

    const historial = await db.tarifaVentaHistorial.findMany({
      where: { material, espesor },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });

    return NextResponse.json(historial);
  } catch (error) {
    logApiError(error, 'GET /api/tarifas-venta-historial');
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
