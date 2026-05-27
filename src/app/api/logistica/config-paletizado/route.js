import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { logUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET: Obtener configuración de paletizado
export async function GET() {
  try {
    const configs = await db.configPaletizado.findMany();
    return NextResponse.json(configs);
  } catch (error) {
    logApiError(error, 'Error fetching config paletizado:');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT: Actualizar configuración de paletizado
export async function PUT(request) {
  try {
    const { tipo, costePale, costeFilm, costeFleje, costePrecinto } = await request.json();

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de palé requerido' }, { status: 400 });
    }

    const oldConfig = await db.configPaletizado.findUnique({
      where: { tipo },
      select: { costePale: true, costeFilm: true, costeFleje: true, costePrecinto: true },
    });

    const updatedData = {
      costePale: parseFloat(costePale),
      costeFilm: parseFloat(costeFilm),
      costeFleje: parseFloat(costeFleje),
      costePrecinto: parseFloat(costePrecinto),
    };

    const updated = await db.configPaletizado.update({
      where: { tipo },
      data: updatedData,
    });

    if (oldConfig) {
      await logUpdate('ConfigPaletizado', updated.id, oldConfig, updatedData, 'Admin');
    }

    return NextResponse.json(updated);
  } catch (error) {
    logApiError(error, 'Error updating config paletizado:');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
