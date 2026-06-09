import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking, claveEvento } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/sync
 *
 * Endpoint llamado por el cron de Linux 3 veces al día.
 * Para cada importación con trackingActivo=true y estado != RECIBIDO:
 *   1. Consulta Ship24 (respeta caché de 4h para no agotar el plan gratuito)
 *   2. Si hay evento nuevo → actualiza DB + envía WhatsApp via CallMeBot
 *
 * No requiere cuerpo ni parámetros.
 */
export async function POST() {
  try {
    const ahora = new Date();

    // Solo importaciones activas que no hayan llegado todavía
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

        // Respetar caché: no consultar si ya se comprobó hace menos de 4 horas
        if (imp.ultimoTrackingCheck) {
          const horasDesde = (ahora - new Date(imp.ultimoTrackingCheck)) / 3_600_000;
          if (horasDesde < 4) {
            resultados.push({ id: imp.id, status: 'en_cache', trackingNum });
            continue;
          }
        }

        const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

        await db.importacionContenedor.update({
          where: { id: imp.id },
          data: {
            ultimoTrackingCheck: ahora,
            // Guardar UUID de Terminal49 en courierCode para syncs posteriores sin coste
            ...(tracking?.shipmentId && { courierCode: tracking.shipmentId }),
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

        const claveNueva   = claveEvento(tracking.ultimoEvento);
        const hayNuevidad  = claveNueva && claveNueva !== imp.ultimoEvento;

        if (hayNuevidad) {
          const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento);
          const enviado  = await enviarWhatsApp(mensaje);
          resultados.push({
            id: imp.id, status: 'notificado', trackingNum,
            evento: tracking.ultimoEvento.description, whatsapp: enviado,
          });
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
