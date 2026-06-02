import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { modeloGrapaSchema, validateData } from '@/lib/validations';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateData(modeloGrapaSchema.partial(), body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { tipo, nombre, espesorDesde, espesorHasta, anchosDisponibles, precioMetroLineal } = validation.data;
    const updated = await db.modeloGrapa.update({
      where: { id: parseInt(id) },
      data: {
        ...(tipo !== undefined && { tipo }),
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(espesorDesde !== undefined && { espesorDesde }),
        ...(espesorHasta !== undefined && { espesorHasta: espesorHasta ?? null }),
        ...(anchosDisponibles !== undefined && {
          anchosDisponibles: anchosDisponibles ? anchosDisponibles.slice().sort((a, b) => a - b) : null,
        }),
        ...(precioMetroLineal !== undefined && { precioMetroLineal }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Modelo de grapa no encontrado' });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.modeloGrapa.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: 'Modelo eliminado correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Modelo de grapa no encontrado' });
  }
}
