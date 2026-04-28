import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { nombre, fabricante, descripcion, precioMetro } = await request.json();
    const updated = await db.grapa.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(fabricante !== undefined && { fabricante: fabricante?.trim() || null }),
        ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
        ...(precioMetro !== undefined && { precioMetro: parseFloat(precioMetro) }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Grapa no encontrada' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.grapa.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Grapa eliminada correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Grapa no encontrada' });
  }
}
