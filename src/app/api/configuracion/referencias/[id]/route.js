import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/configuracion/referencias/[id]
export async function PUT(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    const data = await request.json();

    const updatedItem = await db.referenciaBobina.update({
      where: { id: id },
      data: { 
        referencia: data.nombre, // Usamos 'nombre' del form, que mapea a 'referencia' en Prisma
        ancho: parseFloat(data.ancho) || 0,
        lonas: parseInt(data.lonas) || 0,
        pesoPorMetroLineal: parseFloat(data.pesoPorMetroLineal) || 0,
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Referencia no encontrada' }, { status: 404 });
    }
     if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'Ya existe una referencia con este nombre' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar referencia' }, { status: 500 });
  }
}

// DELETE /api/configuracion/referencias/[id]
export async function DELETE(request, { params: paramsPromise }) {
  try {
    	const { id } = await paramsPromise;
    await db.referenciaBobina.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Referencia eliminada' }, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Referencia no encontrada' }, { status: 404 });
    }
    if (error.code === 'P2003') {
        return NextResponse.json({ message: 'No se puede eliminar: la referencia está en un pedido de bobina.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al eliminar referencia' }, { status: 500 });
  }
}
