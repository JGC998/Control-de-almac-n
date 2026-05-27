import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/precios/bulk-update
export async function POST(request) {
  try {
    const { percentage, material } = await request.json();

    if (percentage === undefined || percentage === null) {
      return NextResponse.json({ message: 'El porcentaje es requerido' }, { status: 400 });
    }

    const parsedPct = parseFloat(percentage);
    if (isNaN(parsedPct) || parsedPct < -99 || parsedPct > 1000) {
      return NextResponse.json({ message: 'Porcentaje fuera de rango permitido (-99 a 1000)' }, { status: 400 });
    }

    const factor = 1 + (parsedPct / 100);
    const whereClause = (!material || material === 'TODOS') ? {} : { material: String(material) };

    const tarifas = await db.tarifaMaterial.findMany({
      where: whereClause,
      select: { id: true, precio: true },
    });

    await db.$transaction(
      tarifas.map(t =>
        db.tarifaMaterial.update({
          where: { id: t.id },
          data: { precio: Number((t.precio * factor).toFixed(4)) },
        })
      )
    );

    return NextResponse.json({ message: 'Precios actualizados correctamente', count: tarifas.length });
  } catch (error) {
    logApiError(error, 'Error en bulk-update:');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
