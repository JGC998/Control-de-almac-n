import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarPosicionVesselFinder, buscarSchedulePorMmsi, enviarWhatsApp } from '@/lib/tracking';

// POST /api/importaciones/[id]/whatsapp
// Envía la posición actual del barco via CallMeBot WhatsApp
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const imp = await db.importacionContenedor.findUnique({
      where: { id },
      select: {
        numContenedor: true, blNumber: true,
        nombreBarco: true, mmsiBarco: true, etaEstimada: true,
      },
    });
    if (!imp) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    if (!imp.mmsiBarco) return NextResponse.json({ error: 'Sin MMSI configurado' }, { status: 400 });

    const contenedor = imp.numContenedor || imp.blNumber || '-';
    const barco      = imp.nombreBarco || 'Barco';

    const [posicion, schedule] = await Promise.all([
      buscarPosicionVesselFinder(imp.mmsiBarco),
      buscarSchedulePorMmsi(imp.mmsiBarco, imp.nombreBarco),
    ]);

    const puertos     = schedule?.puertos ?? [];
    const etaValencia = puertos.find(p =>
      p.portCode === 'ESVLC' || p.puerto?.toLowerCase().includes('valencia')
    );
    const etaFinal = etaValencia?.eta ?? imp.etaEstimada;

    const fmtFecha = (d) => d
      ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const lineas = [
      `🚢 *${barco}* — ${contenedor}`,
      posicion?.sog && posicion?.cog
        ? `⚡ ${posicion.sog} kn · Rumbo ${posicion.cog}°${posicion.lrpd ? ` (hace ${posicion.lrpd})` : ''}`
        : null,
      posicion?.lat != null && posicion?.lon != null
        ? `📍 Posición: https://www.google.com/maps?q=${posicion.lat},${posicion.lon}&z=5`
        : null,
      etaFinal ? `🏁 ETA Valencia: *${fmtFecha(etaFinal)}*` : null,
      `🔍 https://www.vesselfinder.com/vessels/details/${imp.mmsiBarco}`,
    ].filter(Boolean).join('\n');

    const resultados = await enviarWhatsApp(lineas);
    if (!resultados || resultados.length === 0) {
      return NextResponse.json({ error: 'CallMeBot no configurado (CALLMEBOT_PHONE / CALLMEBOT_APIKEY)' }, { status: 503 });
    }

    const exito = resultados.some(r => r.ok);
    return NextResponse.json({ ok: exito, resultados, mensaje: lineas });

  } catch (error) {
    logApiError(error, 'POST /api/importaciones/[id]/whatsapp');
    return NextResponse.json({ error: 'Error al enviar WhatsApp' }, { status: 500 });
  }
}
