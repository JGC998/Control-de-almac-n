import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { importacionContenedorSchema } from '@/lib/validations';
import { actualizarPrecioGrapas } from '@/lib/importacion-grapas';
import { actualizarPrecioMateriales } from '@/lib/importacion-materiales';

// PATCH /api/importaciones/[id] — actualización parcial (estado, trackingActivo)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { estado, trackingActivo, nombreBarco } = await request.json();
    const data = {};
    if (estado !== undefined) {
      const ESTADOS_VALIDOS = ['PEDIDO', 'TRANSITO', 'ADUANA', 'RECIBIDO', 'BORRADOR'];
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      data.estado = estado;
    }
    if (trackingActivo !== undefined)  data.trackingActivo = trackingActivo;
    if (nombreBarco     !== undefined)  data.nombreBarco    = nombreBarco || null;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }
    const registro = await db.importacionContenedor.update({ where: { id }, data });
    return NextResponse.json(registro);
  } catch (error) {
    logApiError(error, 'PATCH /api/importaciones/[id]');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE /api/importaciones/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.importacionContenedor.delete({ where: { id } });
    return NextResponse.json({ message: 'Importación eliminada' });
  } catch (error) {
    logApiError(error, 'DELETE /api/importaciones/[id]');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al eliminar la importación' }, { status: 500 });
  }
}

// PUT /api/importaciones/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
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
    const registro = await db.importacionContenedor.update({
      where: { id },
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
    actualizarPrecioGrapas(registro.bobinas, registro.totalBobinasEUR, registro.gastosRepercutibles, registro.tasaCambio, id).catch(() => {});
    actualizarPrecioMateriales(registro.bobinas, registro.totalBobinasEUR, registro.gastosRepercutibles, registro.tasaCambio).catch(() => {});
    return NextResponse.json(registro);
  } catch (error) {
    logApiError(error, 'PUT /api/importaciones/[id]');
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Importación no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar la importación' }, { status: 500 });
  }
}

// GET /api/importaciones/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const imp = await db.importacionContenedor.findUnique({ where: { id } });
    if (!imp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(imp);
  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]');
    return NextResponse.json({ error: 'Error al obtener la importación' }, { status: 500 });
  }
}
