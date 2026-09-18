import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

// PUT /api/estrella-medidas/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { ancho, largo, cantidad, descripcion } = await request.json();
    const medida = await db.estrellaMedida.update({
      where: { id: parseInt(id, 10) },
      data: {
        ancho: parseFloat(ancho),
        largo: parseFloat(largo),
        cantidad: parseInt(cantidad, 10),
        descripcion: descripcion?.trim() || null,
      },
    });
    return NextResponse.json(medida);
  } catch (error) {
    logApiError(error, 'PUT /api/estrella-medidas/[id]');
    return NextResponse.json({ message: 'Error al actualizar medida' }, { status: 500 });
  }
}

// DELETE /api/estrella-medidas/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.estrellaMedida.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(error, 'DELETE /api/estrella-medidas/[id]');
    return NextResponse.json({ message: 'Error al eliminar medida' }, { status: 500 });
  }
}
