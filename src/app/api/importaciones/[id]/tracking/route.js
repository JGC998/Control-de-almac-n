import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, claveEvento } from '@/lib/tracking';

/**
 * GET /api/importaciones/[id]/tracking
 * Devuelve los datos de tracking cacheados + los eventos frescos de Ship24.
 * Se usa para el botón "Actualizar ahora" en la UI.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const imp = await db.importacionContenedor.findUnique({
      where: { id },
      select: {
        id: true, numContenedor: true, blNumber: true,
        ultimoEvento: true, ultimoEstadoTracking: true,
        ultimoTrackingCheck: true, etaEstimada: true,
        descripcion: true, estado: true, courierCode: true,
      },
    });
    if (!imp) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const trackingNum = imp.numContenedor?.trim() || imp.blNumber?.trim();
    if (!trackingNum) {
      return NextResponse.json({ error: 'Sin número de contenedor o BL' }, { status: 400 });
    }

    const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

    if (tracking) {
      await db.importacionContenedor.update({
        where: { id },
        data: {
          ultimoTrackingCheck: new Date(),
          // Guardar UUID de Terminal49 para no gastar créditos en syncs posteriores
          ...(tracking.shipmentId && { courierCode: tracking.shipmentId }),
          ...(tracking.ultimoEvento && {
            ultimoEvento:         claveEvento(tracking.ultimoEvento),
            ultimoEstadoTracking: tracking.ultimoEvento.status ?? null,
          }),
          ...(tracking.eta && { etaEstimada: new Date(tracking.eta) }),
        },
      });
    }

    return NextResponse.json({
      trackingNum,
      eventos: tracking?.eventos ?? [],
      ultimoEvento: tracking?.ultimoEvento ?? null,
      eta: tracking?.eta ?? null,
      consultadoEn: new Date().toISOString(),
    });

  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]/tracking');
    return NextResponse.json({ error: 'Error al obtener tracking' }, { status: 500 });
  }
}
