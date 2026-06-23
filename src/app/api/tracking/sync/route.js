import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking, formatearMensajeBarco, claveEvento, extraerNombreBarco, buscarScheduleBarco } from '@/lib/tracking';
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
        ultimaPosicionBarco: true,
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

        const claveNueva      = claveEvento(tracking.ultimoEvento);
        const hayNuevoEvento  = claveNueva && claveNueva !== imp.ultimoEvento;

        const nombreBarco   = extraerNombreBarco(tracking.eventos);
        const scheduleBarco = nombreBarco
          ? await buscarScheduleBarco(nombreBarco).catch(() => null)
          : null;

        // Detectar cambio de posición del barco
        const posicionActual    = scheduleBarco?.puertos?.find(p => p.esPosicionActual) ?? null;
        const clavePos          = posicionActual ? `${posicionActual.puerto}|${posicionActual.ata ?? posicionActual.eta ?? ''}` : null;
        const hayNuevaPosicion  = clavePos && clavePos !== imp.ultimaPosicionBarco;

        await db.importacionContenedor.update({
          where: { id: imp.id },
          data: {
            ultimoTrackingCheck: ahora,
            ...(tracking.ultimoEvento && {
              ultimoEvento:         claveEvento(tracking.ultimoEvento),
              ultimoEstadoTracking: tracking.ultimoEvento.status ?? null,
            }),
            ...(tracking.eta  && { etaEstimada: new Date(tracking.eta) }),
            ...(nombreBarco   && { nombreBarco }),
            ...(clavePos      && { ultimaPosicionBarco: clavePos }),
          },
        });

        const notificaciones = [];

        // 1. Nuevo evento del contenedor
        if (hayNuevoEvento) {
          const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento, tracking.eta, scheduleBarco);
          notificaciones.push(enviarWhatsApp(mensaje));
        }

        // 2. Barco llegó a un nuevo puerto (independiente del evento del contenedor)
        if (hayNuevaPosicion && !hayNuevoEvento) {
          const proximoPuerto = scheduleBarco.puertos.find(p => p.eta) ?? null;
          const payload       = { ...posicionActual, vesselName: scheduleBarco.vesselName, vesselCode: scheduleBarco.vesselCode };
          const mensaje       = formatearMensajeBarco(imp, payload, proximoPuerto);
          notificaciones.push(enviarWhatsApp(mensaje));
        }

        if (notificaciones.length > 0) {
          const todos = await Promise.all(notificaciones);
          const ok    = todos.every(r => r.some(p => p.ok));
          const tipo  = hayNuevoEvento && hayNuevaPosicion ? 'contenedor+barco'
                      : hayNuevoEvento ? 'contenedor' : 'barco';
          return { id: imp.id, status: 'notificado', tipo, trackingNum, whatsapp: ok };
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