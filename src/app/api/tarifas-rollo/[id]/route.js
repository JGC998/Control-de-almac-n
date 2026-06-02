import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { logUpdate, logDelete } from '@/lib/audit';
import { tarifaRolloUpdateSchema, validateData } from '@/lib/validations';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateData(tarifaRolloUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { metrajeMinimo, precioBase, peso, ancho } = validation.data;
    const tarifaAnterior = await db.tarifaRollo.findUnique({ where: { id } });
    const tarifa = await db.tarifaRollo.update({
      where: { id },
      data: {
        ...(metrajeMinimo !== undefined && { metrajeMinimo }),
        ...(precioBase !== undefined && { precioBase }),
        ...(peso !== undefined && { peso }),
        ...(ancho !== undefined && { ancho }),
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
