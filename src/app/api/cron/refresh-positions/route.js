import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarPosicionVesselFinder } from '@/lib/tracking';

// GET /api/cron/refresh-positions?secret=TU_CRON_SECRET
// Actualiza ultimaPosicionBarco para todos los contenedores en tránsito con MMSI.
// Llamar desde Windows Task Scheduler cada 6-8 horas:
//   curl "http://192.168.1.250:3000/api/cron/refresh-positions?secret=TU_CRON_SECRET"
export async function GET(request) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const contenedores = await db.importacionContenedor.findMany({
      where: {
        mmsiBarco: { not: null },
        estado:    { not: 'RECIBIDO' },
      },
      select: { id: true, mmsiBarco: true },
    });

    const resultados = [];
    for (const c of contenedores) {
      try {
        const pos = await buscarPosicionVesselFinder(c.mmsiBarco);
        if (pos) {
          await db.importacionContenedor.update({
            where: { id: c.id },
            data: { ultimaPosicionBarco: JSON.stringify({ ...pos, at: new Date().toISOString() }) },
          });
          resultados.push({ id: c.id, mmsi: c.mmsiBarco, ok: true });
        } else {
          resultados.push({ id: c.id, mmsi: c.mmsiBarco, ok: false, motivo: 'sin datos' });
        }
        // Pausa entre peticiones para no saturar VesselFinder
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        logApiError(e, `cron:pos:${c.mmsiBarco}`);
        resultados.push({ id: c.id, mmsi: c.mmsiBarco, ok: false, motivo: e.message });
      }
    }

    return NextResponse.json({
      ok:          true,
      ejecutadoEn: new Date().toISOString(),
      total:       contenedores.length,
      actualizados: resultados.filter(r => r.ok).length,
      resultados,
    });
  } catch (error) {
    logApiError(error, 'GET /api/cron/refresh-positions');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
