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
        numContenedor: true,
        blNumber:      true,
        descripcion:   true,
        nombreBarco:   true,
        mmsiBarco:     true,
        etaEstimada:   true,
        proveedor:     { select: { nombre: true } },
      },
    });
    if (!imp) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    if (!imp.mmsiBarco) return NextResponse.json({ error: 'Sin MMSI configurado' }, { status: 400 });

    const contenedor = imp.numContenedor || imp.blNumber || '-';
    const barco      = imp.nombreBarco || 'Barco';
    const proveedor  = imp.proveedor?.nombre ?? null;

    const [posicion, schedule] = await Promise.all([
      buscarPosicionVesselFinder(imp.mmsiBarco),
      buscarSchedulePorMmsi(imp.mmsiBarco, imp.nombreBarco),
    ]);

    const puertos = schedule?.puertos ?? [];

    // Puerto de origen: último confirmado (con ATA), ordenado por fecha desc
    const ultimoPuerto = puertos
      .filter(p => p.ata)
      .sort((a, b) => new Date(b.ata) - new Date(a.ata))[0]
      ?? puertos.find(p => p.esPosicionActual)
      ?? null;
    const origenNombre = ultimoPuerto?.puerto ?? null;

    // ETA Valencia
    const etaValencia = puertos.find(p =>
      p.portCode === 'ESVLC' || p.puerto?.toLowerCase().includes('valencia'),
    );
    const etaFinal = etaValencia?.eta ?? imp.etaEstimada;

    const fmtFecha = (d) => d
      ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    // Días restantes hasta ETA
    const diasRestantes = etaFinal
      ? Math.ceil((new Date(etaFinal) - new Date()) / (1000 * 60 * 60 * 24))
      : null;
    const etaDias = diasRestantes && diasRestantes > 0 ? ` (en ${diasRestantes} días)` : '';

    const lineas = [
      `🚢 *${barco}*`,
      proveedor
        ? `📦 ${contenedor} — ${proveedor}`
        : `📦 ${contenedor}`,
      origenNombre ? `🗺 ${origenNombre} → Valencia` : null,
      ``,
      posicion?.lrpd
        ? `📡 Señal AIS: ${posicion.lrpd}`
        : null,
      posicion?.sog && posicion?.cog
        ? `⚡ ${posicion.sog} kn  ·  🧭 ${posicion.cog}°`
        : null,
      posicion?.lat != null && posicion?.lon != null
        ? `📍 https://maps.google.com/?q=${posicion.lat},${posicion.lon}`
        : null,
      ``,
      etaFinal ? `📅 ETA Valencia: *${fmtFecha(etaFinal)}*${etaDias}` : null,
      ``,
      `──────────────────`,
      `Seguimiento: https://www.marinetraffic.com/en/ais/home/mmsi:${imp.mmsiBarco}`,
    ].filter(l => l !== null).join('\n');

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
