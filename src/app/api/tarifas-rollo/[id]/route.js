import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { metrajeMinimo, precioBase, peso, ancho } = await request.json();
    const tarifa = await db.tarifaRollo.update({
      where: { id },
      data: {
        ...(metrajeMinimo !== undefined && { metrajeMinimo: parseFloat(metrajeMinimo) }),
        ...(precioBase !== undefined && { precioBase: parseFloat(precioBase) }),
        ...(peso !== undefined && { peso: parseFloat(peso) }),
        ...(ancho !== undefined && { ancho: ancho ? parseFloat(ancho) : null }),
      },
    });
    return NextResponse.json(tarifa);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.tarifaRollo.delete({ where: { id } });
    return NextResponse.json({ message: 'Tarifa eliminada correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}
