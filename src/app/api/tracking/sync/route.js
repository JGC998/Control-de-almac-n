import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking, formatearMensajeBarco, formatearMensajeTransbordo, claveEvento, extraerNombreBarco, buscarScheduleBarco } from '@/lib/tracking';
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
        nombreBarco: true,
        ultimaPosicionBarco: true,
        etaEstimada: true,
        ultimaAlertaEta: true,
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

        const nombreBarcoNuevo = extraerNombreBarco(tracking.eventos);
        // Si el nombre guardado en BD tiene espacios y > 6 chars, el usuario lo editó manualmente
        // (ej: "ONE SOLIDARITY"). No comparar contra el código corto extraído (ej: "OSOL").
        const esNombreManual = imp.nombreBarco && imp.nombreBarco.length > 6 && imp.nombreBarco.includes(' ');
        const hayTransbordo  = nombreBarcoNuevo && imp.nombreBarco && !esNombreManual && nombreBarcoNuevo !== imp.nombreBarco;

        const scheduleBarco = nombreBarcoNuevo
          ? await buscarScheduleBarco(nombreBarcoNuevo).catch(() => null)
          : null;

        // Detectar cambio de posición del barco
        const posicionActual   = scheduleBarco?.puertos?.find(p => p.esPosicionActual) ?? null;
        // Solo el código/nombre del puerto — sin fecha, para que ETA→ATA no dispare un segundo mensaje
        const clavePos         = posicionActual ? (posicionActual.portCode ?? posicionActual.puerto) : null;
        // Al transbordo reseteamos ultimaPosicionBarco para empezar fresco con el nuevo barco
        const posAnterior      = hayTransbordo ? null : imp.ultimaPosicionBarco;
        const hayNuevaPosicion = clavePos && clavePos !== posAnterior;

        await db.importacionContenedor.update({
          where: { id: imp.id },
          data: {
            ultimoTrackingCheck: ahora,
            ...(tracking.ultimoEvento && {
              ultimoEvento:         claveEvento(tracking.ultimoEvento),
              ultimoEstadoTracking: tracking.ultimoEvento.status ?? null,
            }),
            ...(tracking.eta        && { etaEstimada: new Date(tracking.eta) }),
            // No sobreescribir nombre manual del usuario con el código corto extraído
            ...(nombreBarcoNuevo && !esNombreManual && { nombreBarco: nombreBarcoNuevo }),
            ...(clavePos            && { ultimaPosicionBarco: clavePos }),
          },
        });

        // Resolver ETA definitiva: la del tracking o la ya almacenada
        const etaFinal = tracking.eta
          ? new Date(tracking.eta)
          : imp.etaEstimada ?? null;

        // Comprobar alerta de llegada próxima (hoy o mañana)
        let alertaEtaEnviada = false;
        if (etaFinal) {
          const horasHastaEta = (etaFinal.getTime() - ahora.getTime()) / 3_600_000;
          const yaAlertadoReciente = imp.ultimaAlertaEta
            && (ahora.getTime() - imp.ultimaAlertaEta.getTime()) < 24 * 3_600_000;

          if (horasHastaEta >= 0 && horasHastaEta <= 48 && !yaAlertadoReciente) {
            const llegaHoy = horasHastaEta <= 24;
            const fechaEtaStr = etaFinal.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const mensajeEta =
              `🚢 LLEGADA ${llegaHoy ? 'HOY' : 'MAÑANA'} — ${imp.descripcion || imp.numContenedor || imp.blNumber}\n` +
              `📅 ETA: ${fechaEtaStr}\n` +
              `📦 Contenedor: ${imp.numContenedor || imp.blNumber || '—'}`;
            await enviarWhatsApp(mensajeEta);
            await db.importacionContenedor.update({
              where: { id: imp.id },
              data: { ultimaAlertaEta: ahora },
            });
            alertaEtaEnviada = true;
          }
        }

        const notificaciones = [];

        // 1. Nuevo evento del contenedor
        if (hayNuevoEvento) {
          const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento, tracking.eta, scheduleBarco);
          notificaciones.push(enviarWhatsApp(mensaje));
        }

        // 2. Transbordo a nuevo barco
        if (hayTransbordo) {
          const puerto  = posicionActual ?? null;
          const mensaje = formatearMensajeTransbordo(imp, imp.nombreBarco, nombreBarcoNuevo, scheduleBarco?.vesselName, puerto);
          notificaciones.push(enviarWhatsApp(mensaje));
        } else if (hayNuevaPosicion && !hayNuevoEvento) {
          // 3. Barco llegó a nuevo puerto (sin evento de contenedor ni transbordo)
          const proximoPuerto = scheduleBarco.puertos.find(p => p.eta && !p.esPosicionActual) ?? null;
          const payload       = { ...posicionActual, vesselName: scheduleBarco.vesselName, vesselCode: scheduleBarco.vesselCode };
          const mensaje       = formatearMensajeBarco(imp, payload, proximoPuerto);
          notificaciones.push(enviarWhatsApp(mensaje));
        }

        if (notificaciones.length > 0) {
          const todos = await Promise.all(notificaciones);
          const ok    = todos.every(r => Array.isArray(r) && r.some(p => p.ok));
          const tipos = [hayNuevoEvento && 'contenedor', hayTransbordo && 'transbordo', hayNuevaPosicion && !hayNuevoEvento && !hayTransbordo && 'barco', alertaEtaEnviada && 'eta'].filter(Boolean);
          return { id: imp.id, status: 'notificado', tipo: tipos.join('+'), trackingNum, whatsapp: ok };
        }
        if (alertaEtaEnviada) {
          return { id: imp.id, status: 'notificado', tipo: 'eta', trackingNum, whatsapp: true };
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