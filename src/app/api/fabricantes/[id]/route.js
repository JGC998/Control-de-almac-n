import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { nombre } = await request.json();
    const updatedItem = await db.fabricante.update({ where: { id }, data: { nombre } });
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Fabricante no encontrado',
      conflict: 'El fabricante ya existe',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.fabricante.delete({ where: { id } });
    return NextResponse.json({ message: 'Fabricante eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Fabricante no encontrado',
      hasRelated: 'No se puede eliminar: el fabricante tiene productos asociados.',
    });
  }
}
