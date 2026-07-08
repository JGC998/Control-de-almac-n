import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarPosicionVesselFinder, buscarSchedulePorMmsi, buscarScheduleBarco, enviarWhatsApp, reverseGeocode } from '@/lib/tracking';

// GET /api/cron/refresh-positions?secret=TU_CRON_SECRET
// Actualiza posición AIS y detecta cambios de ETA para enviar WhatsApp.
// Crontab del servidor: 0 6,12,18,0 * * * curl -s "http://localhost:3000/api/cron/refresh-positions"
export async function GET(request) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // ?force=1 → envía WhatsApp aunque la ETA no haya cambiado (útil para pruebas)
  const forzarNotificacion = request.nextUrl.searchParams.get('force') === '1';

  try {
    const contenedores = await db.importacionContenedor.findMany({
      where: { estado: { not: 'RECIBIDO' } },
      select: {
        id:                  true,
        numContenedor:       true,
        blNumber:            true,
        descripcion:         true,
        mmsiBarco:           true,
        nombreBarco:         true,
        etaEstimada:         true,
        ultimoEstadoTracking: true,
        ultimaPosicionBarco: true,
        proveedor:           { select: { nombre: true } },
      },
    });

    const resultados = [];

    for (const c of contenedores) {
      try {
        const [posicion, schedule] = await Promise.all([
          c.mmsiBarco ? buscarPosicionVesselFinder(c.mmsiBarco) : Promise.resolve(null),
          c.mmsiBarco
            ? buscarSchedulePorMmsi(c.mmsiBarco, c.nombreBarco)
            : (c.nombreBarco ? buscarScheduleBarco(c.nombreBarco) : Promise.resolve(null)),
        ]);

        // ── Actualizar posición AIS ────────────────────────────────────
        const dataUpdate = {};
        if (posicion) {
          dataUpdate.ultimaPosicionBarco = JSON.stringify({ ...posicion, at: new Date().toISOString() });
        }

        // ── Detectar cambio de ETA ─────────────────────────────────────
        const puertos = schedule?.puertos ?? [];
        const etaValencia = puertos.find(p =>
          p.portCode === 'ESVLC' || p.puerto?.toLowerCase().includes('valencia'),
        );
        const nuevaEta = etaValencia?.eta ?? null;
        const etaAnterior = c.etaEstimada;

        const cambioDias = nuevaEta && etaAnterior
          ? Math.abs((new Date(nuevaEta) - new Date(etaAnterior)) / (1000 * 60 * 60 * 24))
          : null;

        // Guardamos la ETA si cambia más de 4 horas o no había ETA previa
        const etaCambioSignificativo = nuevaEta && (!etaAnterior || (cambioDias !== null && cambioDias > 0.17));
        if (etaCambioSignificativo) {
          dataUpdate.etaEstimada = new Date(nuevaEta);
        }

        if (Object.keys(dataUpdate).length > 0) {
          await db.importacionContenedor.update({ where: { id: c.id }, data: dataUpdate });
        }

        // ── Notificar por WhatsApp si la ETA cambió más de 4 horas (o force=1) ──
        let whatsappEnviado = false;
        if (forzarNotificacion || (etaCambioSignificativo && cambioDias !== null && cambioDias > 0.17)) {
          try {
            const contenedor  = c.numContenedor || c.blNumber || '-';
            const barco       = c.nombreBarco || 'Barco';
            const proveedor   = c.proveedor?.nombre ?? null;

            const fmtFecha = d => d
              ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;

            const diasRestantes = nuevaEta
              ? Math.ceil((new Date(nuevaEta) - new Date()) / (1000 * 60 * 60 * 24))
              : null;
            const etaDias = diasRestantes && diasRestantes > 0 ? ` (en ${diasRestantes} días)` : '';

            const ultimoPuerto = puertos
              .filter(p => p.ata)
              .sort((a, b) => new Date(b.ata) - new Date(a.ata))[0]
              ?? puertos.find(p => p.esPosicionActual)
              ?? null;
            const origenNombre = ultimoPuerto?.puerto ?? null;

            const puertosLinea = puertos.length > 1
              ? '🛳 ' + puertos.map(p => (p.esPosicionActual ? '📍' : '') + p.puerto).join(' → ')
              : null;

            const difDias = cambioDias >= 1
              ? `${Math.round(cambioDias)} días`
              : `${Math.round(cambioDias * 24)} horas`;

            const zona = (posicion?.lat != null && posicion?.lon != null)
              ? await reverseGeocode(posicion.lat, posicion.lon)
              : null;

            const encabezado = forzarNotificacion && !etaCambioSignificativo
              ? `📡 *Actualización de posición*`
              : `⚠️ *Cambio de ETA detectado* (${difDias})`;

            const lineas = [
              encabezado,
              `🚢 *${barco}*`,
              proveedor ? `📦 ${contenedor} — ${proveedor}` : `📦 ${contenedor}`,
              origenNombre ? `🗺 ${origenNombre} → Valencia` : null,
              ``,
              posicion?.sog && posicion?.cog
                ? `⚡ ${posicion.sog} kn  ·  🧭 ${posicion.cog}°`
                : null,
              zona ? `🌍 ${zona}` : null,
              posicion?.lat != null && posicion?.lon != null
                ? `📍 https://maps.google.com/?q=${posicion.lat},${posicion.lon}`
                : null,
              ``,
              etaAnterior ? `❌ ETA anterior: ${fmtFecha(etaAnterior)}` : null,
              `✅ ETA nueva:     *${fmtFecha(nuevaEta)}*${etaDias}`,
              puertosLinea,
              ``,
              `──────────────────`,
              c.mmsiBarco
                ? `Seguimiento: https://www.marinetraffic.com/en/ais/home/mmsi:${c.mmsiBarco}`
                : (c.numContenedor ? `Ref: ${c.numContenedor}` : null),
            ].filter(l => l !== null).join('\n');

            await enviarWhatsApp(lineas);
            whatsappEnviado = true;
          } catch (e) {
            logApiError(e, `cron:whatsapp:${c.id}`);
          }
        }

        resultados.push({
          id:              c.id,
          mmsi:            c.mmsiBarco,
          posicionOk:      !!posicion,
          etaAnterior:     etaAnterior,
          etaNueva:        nuevaEta,
          cambioDias:      cambioDias ? Math.round(cambioDias * 10) / 10 : null,
          whatsappEnviado,
        });

        // Pausa entre peticiones para no saturar VesselFinder
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        logApiError(e, `cron:contenedor:${c.id}`);
        resultados.push({ id: c.id, ok: false, motivo: e.message });
      }
    }

    const notificados = resultados.filter(r => r.whatsappEnviado).length;

    return NextResponse.json({
      ok:            true,
      ejecutadoEn:   new Date().toISOString(),
      total:         contenedores.length,
      actualizados:  resultados.filter(r => r.posicionOk).length,
      notificados,
      resultados,
    });
  } catch (error) {
    logApiError(error, 'GET /api/cron/refresh-positions');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
