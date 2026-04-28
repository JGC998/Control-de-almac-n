import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const material = await db.material.findUnique({ where: { nombre: data.material } });
    if (!material) {
      return NextResponse.json({ message: 'Material no encontrado' }, { status: 400 });
    }

    const updatedItem = await db.tarifaMaterial.update({
      where: { id },
      data: {
        material: material.nombre,
        espesor: parseFloat(data.espesor),
        precio: parseFloat(data.precio),
        peso: parseFloat(data.peso),
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Tarifa no encontrada',
      conflict: 'Ya existe una tarifa para ese Material y Espesor.',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.tarifaMaterial.delete({ where: { id } });
    return NextResponse.json({ message: 'Tarifa eliminada' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}
