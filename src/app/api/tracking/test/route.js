import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { enviarWhatsApp } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/test
 * Envía un WhatsApp de prueba con el estado del último contenedor activo.
 */
export async function POST() {
  try {
    const imp = await db.importacionContenedor.findFirst({
      where: { trackingActivo: true },
      orderBy: { creadaEn: 'desc' },
      select: {
        id: true,
        numContenedor: true,
        blNumber: true,
        descripcion: true,
        estado: true,
        ultimoEstadoTracking: true,
        ultimoTrackingCheck: true,
        etaEstimada: true,
      },
    });

    if (!imp) {
      return NextResponse.json({ error: 'No hay contenedores con tracking activo' }, { status: 404 });
    }

    const num = imp.numContenedor || imp.blNumber || 'Sin número';
    const ultimoCheck = imp.ultimoTrackingCheck
      ? new Date(imp.ultimoTrackingCheck).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'Nunca';
    const eta = imp.etaEstimada
      ? new Date(imp.etaEstimada).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    const lineas = [
      `🧪 PRUEBA DE WHATSAPP`,
      `📦 Contenedor: ${num}`,
      imp.descripcion ? `📋 ${imp.descripcion}` : null,
      `🔄 Estado: ${imp.estado}`,
      imp.ultimoEstadoTracking ? `📍 Último evento: ${imp.ultimoEstadoTracking}` : null,
      eta ? `🕐 ETA estimada: ${eta}` : null,
      `⏱ Último check: ${ultimoCheck}`,
      `✅ Si recibes este mensaje, la configuración es correcta`,
    ].filter(Boolean).join('\n');

    const enviado = await enviarWhatsApp(lineas);

    return NextResponse.json({
      ok: enviado,
      contenedor: num,
      mensaje: lineas,
    });

  } catch (error) {
    logApiError(error, 'POST /api/tracking/test');
    return NextResponse.json({ error: 'Error al enviar prueba' }, { status: 500 });
  }
}
