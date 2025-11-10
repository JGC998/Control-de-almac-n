import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/materiales/[id]
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const { nombre } = await request.json();

    const updatedItem = await db.material.update({
      where: { id: id },
      data: { nombre: nombre },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 404 });
    }
     if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'El material ya existe' }, { status: 409 });
    }
    console.error('Error al actualizar material:', error);
    return NextResponse.json({ message: 'Error al actualizar material' }, { status: 500 });
  }
}

// DELETE /api/materiales/[id]
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    await db.material.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Material eliminado' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 404 });
    }
    if (error.code === 'P2003') {
        return NextResponse.json({ message: 'No se puede eliminar: el material tiene productos o tarifas asociadas.' }, { status: 409 });
    }
    console.error('Error al eliminar material:', error);
    return NextResponse.json({ message: 'Error al eliminar material' }, { status: 500 });
  }
}
