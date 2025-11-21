import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/fabricantes/[id]
export async function PUT(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    const { nombre } = await request.json();

    const updatedItem = await db.fabricante.update({
      where: { id: id },
      data: { nombre: nombre },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Fabricante no encontrado' }, { status: 404 });
    }
    if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'El fabricante ya existe' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar fabricante' }, { status: 500 });
  }
}

// DELETE /api/fabricantes/[id]
export async function DELETE(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    await db.fabricante.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Fabricante eliminado' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Fabricante no encontrado' }, { status: 404 });
    }
    // P2003: Foreign key constraint failed.
    if (error.code === 'P2003') {
        return NextResponse.json({ message: 'No se puede eliminar: el fabricante tiene productos asociados.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al eliminar fabricante' }, { status: 500 });
  }
}
