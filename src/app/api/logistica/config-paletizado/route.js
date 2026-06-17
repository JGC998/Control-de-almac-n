import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { logUpdate } from '@/lib/audit';
import { configPaletizadoSchema } from '@/lib/validations';

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
    const body = await request.json();
    const parsed = configPaletizadoSchema.safeParse({
      tipo: body.tipo,
      costePale: parseFloat(body.costePale),
      costeFilm: parseFloat(body.costeFilm),
      costeFleje: parseFloat(body.costeFleje),
      costePrecinto: parseFloat(body.costePrecinto),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { tipo, costePale, costeFilm, costeFleje, costePrecinto } = parsed.data;

    const oldConfig = await db.configPaletizado.findUnique({
      where: { tipo },
      select: { costePale: true, costeFilm: true, costeFleje: true, costePrecinto: true },
    });

    const updatedData = { costePale, costeFilm, costeFleje, costePrecinto };

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
