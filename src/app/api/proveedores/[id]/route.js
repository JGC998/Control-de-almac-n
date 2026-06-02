import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';
import { proveedorSchema, validateData } from '@/lib/validations';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateData(proveedorSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { nombre, email, telefono, direccion } = validation.data;
    const updatedItem = await db.proveedor.update({
      where: { id },
      data: { nombre, email, telefono, direccion },
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
