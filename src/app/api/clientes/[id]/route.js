import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cliente = await db.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const updatedCliente = await db.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        email: data.email,
        direccion: data.direccion,
        telefono: data.telefono,
        tier: data.categoria,
      },
    });
    revalidatePath('/gestion/clientes');
    revalidatePath(`/gestion/clientes/${id}`);
    return NextResponse.json(updatedCliente);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Cliente no encontrado' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.cliente.delete({ where: { id } });
    revalidatePath('/gestion/clientes');
    return NextResponse.json({ message: 'Cliente eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Cliente no encontrado',
      hasRelated: 'No se puede eliminar: el cliente tiene pedidos o presupuestos asociados.',
    });
  }
}
