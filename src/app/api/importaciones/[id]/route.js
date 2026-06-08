import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { importacionContenedorSchema } from '@/lib/validations';

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
