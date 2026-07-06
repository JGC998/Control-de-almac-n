import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { buscarTracking, claveEvento, extraerNombreBarco, buscarScheduleBarco, buscarSchedulePorMmsi, buscarPosicionVesselFinder } from '@/lib/tracking';

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
        nombreBarco: true, mmsiBarco: true,
      },
    });
    if (!imp) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const trackingNum = imp.numContenedor?.trim() || imp.blNumber?.trim();
    if (!trackingNum) {
      return NextResponse.json({ error: 'Sin número de contenedor o BL' }, { status: 400 });
    }

    const tracking = await buscarTracking(trackingNum, imp.courierCode || null);

    // Nombre del barco: preferir el que el usuario guardó en DB; solo auto-rellenar si está vacío
    const nombreBarcoExtraido = tracking ? extraerNombreBarco(tracking.eventos) : null;
    const nombreBarco = imp.nombreBarco ?? nombreBarcoExtraido ?? null;

    // Schedule del barco:
    // 1. Si hay MMSI guardado → llama directo a VesselFinder pcext (sin búsqueda por nombre)
    // 2. Si no → busca por nombre (Yang Ming schedule → VesselFinder fallback)
    const [scheduleBarco, posicionBarco] = await Promise.all([
      imp.mmsiBarco
        ? buscarSchedulePorMmsi(imp.mmsiBarco, nombreBarco)
        : (nombreBarco ? buscarScheduleBarco(nombreBarco) : Promise.resolve(null)),
      imp.mmsiBarco
        ? buscarPosicionVesselFinder(imp.mmsiBarco)
        : Promise.resolve(null),
    ]);

    const datosGuardar = {};
    if (tracking) {
      datosGuardar.ultimoTrackingCheck = new Date();
      if (tracking.ultimoEvento) {
        datosGuardar.ultimoEvento         = claveEvento(tracking.ultimoEvento);
        datosGuardar.ultimoEstadoTracking = tracking.ultimoEvento.status ?? null;
      }
      if (tracking.eta) datosGuardar.etaEstimada = new Date(tracking.eta);
      // Solo guardar el nombre extraído si el usuario no tiene ya uno guardado
      if (!imp.nombreBarco && nombreBarcoExtraido) datosGuardar.nombreBarco = nombreBarcoExtraido;
    }
    if (posicionBarco) {
      datosGuardar.ultimaPosicionBarco = JSON.stringify({ ...posicionBarco, at: new Date().toISOString() });
    }
    if (Object.keys(datosGuardar).length > 0) {
      await db.importacionContenedor.update({ where: { id }, data: datosGuardar });
    }

    return NextResponse.json({
      trackingNum,
      eventos: tracking?.eventos ?? [],
      ultimoEvento: tracking?.ultimoEvento ?? null,
      eta: tracking?.eta ?? null,
      nombreBarco,
      scheduleBarco,
      posicionBarco,
      consultadoEn: new Date().toISOString(),
    });

  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]/tracking');
    return NextResponse.json({ error: 'Error al obtener tracking' }, { status: 500 });
  }
}
