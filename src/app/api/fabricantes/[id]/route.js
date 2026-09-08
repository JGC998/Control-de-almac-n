import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { fabricanteSchema, validateData } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const fab = await db.fabricante.findUnique({
      where: { id },
      include: {
        productos: {
          select: {
            id: true,
            nombre: true,
            referenciaFabricante: true,
            tipo: true,
            espesor: true,
            ancho: true,
            largo: true,
            precioUnitario: true,
            pesoUnitario: true,
            color: true,
            activo: true,
            unidad: true,
            material: { select: { nombre: true } },
          },
          orderBy: { nombre: 'asc' },
        },
      },
    });
    if (!fab) return NextResponse.json({ message: 'Fabricante no encontrado' }, { status: 404 });
    return NextResponse.json(fab);
  } catch (error) {
    return handlePrismaError(error, {});
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateData(fabricanteSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const updatedItem = await db.fabricante.update({ where: { id }, data: { nombre: validation.data.nombre.trim().toUpperCase() } });
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
