import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/proveedores/[id]
export async function PUT(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    const data = await request.json();

    const updatedItem = await db.proveedor.update({
      where: { id: id },
      data: { 
        nombre: data.nombre, 
        email: data.email, 
        telefono: data.telefono,
        direccion: data.direccion,
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }
     if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'El proveedor ya existe' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar proveedor' }, { status: 500 });
  }
}

// DELETE /api/proveedores/[id]
export async function DELETE(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    await db.proveedor.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Proveedor eliminado' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }
    if (error.code === 'P2003') {
        return NextResponse.json({ message: 'No se puede eliminar: el proveedor tiene pedidos asociados.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al eliminar proveedor' }, { status: 500 });
  }
}
