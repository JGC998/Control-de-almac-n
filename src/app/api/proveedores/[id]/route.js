import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const updatedItem = await db.proveedor.update({
      where: { id },
      data: { nombre: data.nombre, email: data.email, telefono: data.telefono, direccion: data.direccion },
    });
    revalidatePath('/proveedores');
    revalidatePath(`/proveedores/${id}`);
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Proveedor no encontrado',
      conflict: 'El proveedor ya existe',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.proveedor.delete({ where: { id } });
    revalidatePath('/proveedores');
    return NextResponse.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Proveedor no encontrado',
      hasRelated: 'No se puede eliminar: el proveedor tiene pedidos asociados.',
    });
  }
}
