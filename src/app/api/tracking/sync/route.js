import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking, claveEvento } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/sync
 * Llamado por el cron cada hora (8h-22h).
 * Para cada importacion con trackingActivo=true: consulta Yang Ming,
 * si hay evento nuevo actualiza DB y envia WhatsApp via CallMeBot.
 */
export async function POST() {
  try {
    const ahora = new Date();

    const importaciones = await db.importacionContenedor.findMany({
      where: {
        trackingActivo: true,
        estado: { notIn: ['RECIBIDO'] },
      },
      select: {
        id: true,
        numContenedor: true,
        blNumber: true,
        ultimoEvento: true,
        ultimoTrackingCheck: true,
        descripcion: true,
        estado: true,
        courierCode: true,
      },
    });

    const resultados = [];

    for (const imp of importaciones) {
      try {
        const trackingNum = imp.numContenedor?.trim() || imp.blNumber?.trim();
        if (!trackingNum) {
          resultados.push({ id: imp.id, status: 'sin_numero' });
          continue;
        }

        const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

        await db.importacionContenedor.update({
          where: { id: imp.id },
          data: {
            ultimoTrackingCheck: ahora,
            ...(tracking?.ultimoEvento && {
              ultimoEvento:         claveEvento(tracking.ultimoEvento),
              ultimoEstadoTracking: tracking.ultimoEvento.status ?? null,
            }),
            ...(tracking?.eta && {
              etaEstimada: new Date(tracking.eta),
            }),
          },
        });

        if (!tracking) {
          resultados.push({ id: imp.id, status: 'sin_datos', trackingNum });
          continue;
        }

        const claveNueva  = claveEvento(tracking.ultimoEvento);
        const hayNuevidad = claveNueva && claveNueva !== imp.ultimoEvento;

        if (hayNuevidad) {
          const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento);
          const enviado = await enviarWhatsApp(mensaje);
          resultados.push({ id: imp.id, status: 'notificado', trackingNum, whatsapp: enviado });
        } else {
          resultados.push({ id: imp.id, status: 'sin_cambio', trackingNum });
        }

      } catch (err) {
        logApiError(err, `tracking sync: importacion ${imp.id}`);
        resultados.push({ id: imp.id, status: 'error', message: err.message });
      }
    }

    return NextResponse.json({
      ok: true,
      ejecutadoEn: ahora.toISOString(),
      procesados: importaciones.length,
      resultados,
    });

  } catch (error) {
    logApiError(error, 'POST /api/tracking/sync');
    return NextResponse.json({ error: 'Error en sync de tracking' }, { status: 500 });
  }
}