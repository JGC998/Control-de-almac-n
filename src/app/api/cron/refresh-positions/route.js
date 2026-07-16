import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarPosicionVesselFinder, buscarSchedulePorMmsi, buscarScheduleBarco, enviarWhatsApp, reverseGeocode } from '@/lib/tracking';

// GET /api/cron/refresh-positions
// Envía posición actual de cada contenedor en tránsito por WhatsApp.
// Si la fecha de llegada cambia más de 4 horas, lo avisa también.
// Crontab: 0 9,12,16,22 * * * curl -s "http://localhost:3000/api/cron/refresh-positions"
export async function GET(request) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const contenedores = await db.importacionContenedor.findMany({
      where: { estado: { not: 'RECIBIDO' } },
      select: {
        id:                   true,
        numContenedor:        true,
        blNumber:             true,
        mmsiBarco:            true,
        nombreBarco:          true,
        etaEstimada:          true,
        ultimoEstadoTracking: true,
        ultimaPosicionBarco:  true,
        proveedor:            { select: { nombre: true } },
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

        // ── Actualizar posición en BD ──────────────────────────────────
        const dataUpdate = {};
        if (posicion) {
          dataUpdate.ultimaPosicionBarco = JSON.stringify({ ...posicion, at: new Date().toISOString() });
        }

        // ── Detectar cambio de fecha de llegada ────────────────────────
        const puertos = schedule?.puertos ?? [];
        const puertoValencia = puertos.find(p =>
          p.portCode === 'ESVLC' || p.puerto?.toLowerCase().includes('valencia'),
        );
        const nuevaLlegada = puertoValencia?.eta ?? null;
        const llegadaAnterior = c.etaEstimada;

        const cambioDias = nuevaLlegada && llegadaAnterior
          ? Math.abs((new Date(nuevaLlegada) - new Date(llegadaAnterior)) / (1000 * 60 * 60 * 24))
          : null;

        const llegadaCambio = nuevaLlegada && (!llegadaAnterior || (cambioDias !== null && cambioDias > 0.17));
        if (llegadaCambio) {
          dataUpdate.etaEstimada = new Date(nuevaLlegada);
        }

        if (Object.keys(dataUpdate).length > 0) {
          await db.importacionContenedor.update({ where: { id: c.id }, data: dataUpdate });
        }

        // ── Enviar WhatsApp si hay posición AIS válida ────────────────
        let whatsappEnviado = false;
        if (posicion?.lat != null && posicion?.lon != null) {
          try {
            const contenedor = c.numContenedor || c.blNumber || '-';
            const barco      = c.nombreBarco || 'Barco';
            const proveedor  = c.proveedor?.nombre ?? null;

            const zona = await reverseGeocode(posicion.lat, posicion.lon);

            const fmtFecha = d => d
              ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;

            const llegadaFinal = nuevaLlegada ?? llegadaAnterior ?? null;
            const diasRestantes = llegadaFinal
              ? Math.ceil((new Date(llegadaFinal) - new Date()) / (1000 * 60 * 60 * 24))
              : null;

            const ultimoPuerto = puertos
              .filter(p => p.ata)
              .sort((a, b) => new Date(b.ata) - new Date(a.ata))[0]
              ?? puertos.find(p => p.esPosicionActual)
              ?? null;

            const puertosLinea = puertos.length > 1
              ? '🛳 ' + puertos.map(p => (p.esPosicionActual ? '📍' : '') + p.puerto).join(' → ')
              : null;

            // Aviso de cambio de fecha de llegada (solo cuando cambia)
            let avisoLlegada = null;
            if (llegadaCambio && llegadaAnterior) {
              const difDias = cambioDias >= 1
                ? `${Math.round(cambioDias)} días`
                : `${Math.round(cambioDias * 24)} horas`;
              avisoLlegada = `⚠️ Fecha de llegada cambió ${difDias}: ${fmtFecha(llegadaAnterior)} → *${fmtFecha(nuevaLlegada)}*`;
            }

            const lineas = [
              `📡 *Actualización de posición*`,
              `🚢 *${barco}*`,
              proveedor ? `📦 ${contenedor} — ${proveedor}` : `📦 ${contenedor}`,
              ultimoPuerto?.puerto ? `🗺 ${ultimoPuerto.puerto} → Valencia` : null,
              ``,
              `⚡ ${posicion.sog} kn  ·  🧭 ${posicion.cog}°`,
              zona ? `🌍 ${zona}` : null,
              `📍 https://maps.google.com/?q=${posicion.lat},${posicion.lon}`,
              ``,
              llegadaFinal
                ? `🗓 Llegada prevista: *${fmtFecha(llegadaFinal)}*${diasRestantes > 0 ? ` (en ${diasRestantes} días)` : ''}`
                : null,
              avisoLlegada,
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
          posicionOk:      !!posicion,
          llegadaCambio:   llegadaCambio ?? false,
          whatsappEnviado,
        });

        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        logApiError(e, `cron:contenedor:${c.id}`);
        resultados.push({ id: c.id, ok: false, motivo: e.message });
      }
    }

    return NextResponse.json({
      ok:           true,
      ejecutadoEn:  new Date().toISOString(),
      total:        contenedores.length,
      notificados:  resultados.filter(r => r.whatsappEnviado).length,
      resultados,
    });
  } catch (error) {
    logApiError(error, 'GET /api/cron/refresh-positions');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
