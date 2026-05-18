import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { logUpdate, logDelete } from '@/lib/audit';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { metrajeMinimo, precioBase, peso, ancho } = await request.json();
    const tarifaAnterior = await db.tarifaRollo.findUnique({ where: { id } });
    const tarifa = await db.tarifaRollo.update({
      where: { id },
      data: {
        ...(metrajeMinimo !== undefined && { metrajeMinimo: parseFloat(metrajeMinimo) }),
        ...(precioBase !== undefined && { precioBase: parseFloat(precioBase) }),
        ...(peso !== undefined && { peso: parseFloat(peso) }),
        ...(ancho !== undefined && { ancho: ancho ? parseFloat(ancho) : null }),
      },
    });
    await logUpdate('TarifaRollo', id, tarifaAnterior, tarifa, 'Admin');
    return NextResponse.json(tarifa);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const tarifaAnterior = await db.tarifaRollo.findUnique({ where: { id } });
    await db.tarifaRollo.delete({ where: { id } });
    await logDelete('TarifaRollo', id, tarifaAnterior, 'Admin');
    return NextResponse.json({ message: 'Tarifa eliminada correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Tarifa no encontrada' });
  }
}
