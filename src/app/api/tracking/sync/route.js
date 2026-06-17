import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking, claveEvento, extraerNombreBarco, buscarScheduleBarco } from '@/lib/tracking';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/sync
 * Llamado por el cron cada hora (8h-22h).
 * Para cada importacion con trackingActivo=true: consulta Yang Ming,
 * si hay evento nuevo actualiza DB y envia WhatsApp via CallMeBot.
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`tracking-sync:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

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

    const procesarImportacion = async (imp) => {
      try {
        const trackingNum = imp.numContenedor?.trim() || imp.blNumber?.trim();
        if (!trackingNum) return { id: imp.id, status: 'sin_numero' };

        const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

        if (!tracking) {
          await db.importacionContenedor.update({
            where: { id: imp.id },
            data: { ultimoTrackingCheck: ahora },
          });
          return { id: imp.id, status: 'sin_datos', trackingNum };
        }

        const claveNueva  = claveEvento(tracking.ultimoEvento);
        const hayNuevidad = claveNueva && claveNueva !== imp.ultimoEvento;

        const nombreBarco = extraerNombreBarco(tracking.eventos);

        // Solo pedir schedule del barco si hay evento nuevo (evita llamada extra en cada sync)
        const scheduleBarco = hayNuevidad && nombreBarco
          ? await buscarScheduleBarco(nombreBarco).catch(() => null)
          : null;

        await db.importacionContenedor.update({
          where: { id: imp.id },
          data: {
            ultimoTrackingCheck: ahora,
            ...(tracking.ultimoEvento && {
              ultimoEvento:         claveEvento(tracking.ultimoEvento),
              ultimoEstadoTracking: tracking.ultimoEvento.status ?? null,
            }),
            ...(tracking.eta && { etaEstimada: new Date(tracking.eta) }),
            ...(nombreBarco   && { nombreBarco }),
          },
        });

        if (hayNuevidad) {
          const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento, tracking.eta, scheduleBarco);
          const resultados = await enviarWhatsApp(mensaje);
          return { id: imp.id, status: 'notificado', trackingNum, whatsapp: resultados.some(r => r.ok) };
        }
        return { id: imp.id, status: 'sin_cambio', trackingNum };

      } catch (err) {
        logApiError(err, `tracking sync: importacion ${imp.id}`);
        return { id: imp.id, status: 'error', message: err.message };
      }
    };

    const settled = await Promise.allSettled(importaciones.map(procesarImportacion));
    const resultados = settled.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' });

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