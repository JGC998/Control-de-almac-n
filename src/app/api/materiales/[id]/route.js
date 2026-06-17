import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { nombre } = await request.json();
    const updatedItem = await db.material.update({ where: { id }, data: { nombre } });
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Material no encontrado',
      conflict: 'El material ya existe',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.$transaction(async (tx) => {
      const mat = await tx.material.findUnique({ where: { id } });
      if (mat) {
        await tx.tarifaMaterial.deleteMany({ where: { material: mat.nombre } });
      }
      await tx.material.delete({ where: { id } });
    });
    return NextResponse.json({ message: 'Material eliminado' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Material no encontrado',
      hasRelated: 'No se puede eliminar: el material tiene productos o tarifas asociadas.',
    });
  }
}
