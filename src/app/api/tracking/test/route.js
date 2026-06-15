import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, enviarWhatsApp, formatearMensajeTracking } from '@/lib/tracking';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/test
 * Consulta el estado actual del último contenedor activo y lo envía por WhatsApp.
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
        courierCode: true,
      },
    });

    if (!imp) {
      return NextResponse.json({ error: 'No hay contenedores con tracking activo' }, { status: 404 });
    }

    const trackingNum = imp.numContenedor?.trim() || imp.blNumber?.trim();
    const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

    if (!tracking?.ultimoEvento) {
      return NextResponse.json({ error: 'No se encontró información de tracking para este contenedor', contenedor: trackingNum }, { status: 404 });
    }

    const mensaje = formatearMensajeTracking(imp, tracking.ultimoEvento, tracking.eta);
    const enviado = await enviarWhatsApp(mensaje);

    return NextResponse.json({ ok: enviado, contenedor: trackingNum, mensaje });

  } catch (error) {
    logApiError(error, 'POST /api/tracking/test');
    return NextResponse.json({ error: 'Error al enviar estado' }, { status: 500 });
  }
}
