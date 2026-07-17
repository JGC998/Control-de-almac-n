import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { importacionContenedorSchema } from '@/lib/validations';
import { actualizarPrecioGrapas } from '@/lib/importacion-grapas';
import { actualizarPrecioMateriales } from '@/lib/importacion-materiales';
import { actualizarPrecioTacos } from '@/lib/importacion-tacos';

export const dynamic = 'force-dynamic';

// GET /api/importaciones
export async function GET() {
  try {
    const importaciones = await db.importacionContenedor.findMany({
      orderBy: { creadaEn: 'desc' },
      take: 100,
      include: { proveedor: { select: { id: true, nombre: true } } },
    });
    return NextResponse.json(importaciones);
  } catch (error) {
    logApiError(error, 'GET /api/importaciones');
    return NextResponse.json({ error: 'Error al obtener importaciones' }, { status: 500 });
  }
}

// POST /api/importaciones
export async function POST(request) {
  try {
    const body = await request.json();
    // z.coerce.number() en el schema convierte strings; no hace falta parseFloat manual
    const parsed = importacionContenedorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      descripcion, bobinas,
      proveedorId, numFactura, numContenedor, estado, fechaPedido, fechaLlegada,
      blNumber, trackingActivo,
      ...numeros
    } = parsed.data;

    const registro = await db.importacionContenedor.create({
      data: {
        descripcion: descripcion?.trim() || null,
        ...numeros,
        bobinas: typeof bobinas === 'string' ? bobinas : JSON.stringify(bobinas),
        proveedorId: proveedorId || null,
        numFactura: numFactura?.trim() || null,
        numContenedor: numContenedor?.trim() || null,
        estado: estado ?? 'RECIBIDO',
        fechaPedido: fechaPedido ? new Date(fechaPedido) : null,
        fechaLlegada: fechaLlegada ? new Date(fechaLlegada) : null,
        blNumber: blNumber?.trim() || null,
        trackingActivo: trackingActivo ?? false,
      },
      include: { proveedor: { select: { id: true, nombre: true } } },
    });

    actualizarPrecioGrapas(registro.bobinas, registro.totalBobinasEUR, registro.gastosRepercutibles, registro.tasaCambio, registro.id).catch(err => logApiError(err, 'actualizarPrecioGrapas'));
    actualizarPrecioMateriales(registro.bobinas, registro.totalBobinasEUR, registro.gastosRepercutibles, registro.tasaCambio).catch(err => logApiError(err, 'actualizarPrecioMateriales'));
    actualizarPrecioTacos(registro.bobinas, registro.totalBobinasEUR, registro.gastosRepercutibles, registro.tasaCambio).catch(err => logApiError(err, 'actualizarPrecioTacos'));
    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/importaciones');
    return NextResponse.json({ error: 'Error al guardar la importación' }, { status: 500 });
  }
}
