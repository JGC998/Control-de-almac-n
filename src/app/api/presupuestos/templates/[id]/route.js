import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const template = await db.presupuestoTemplate.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ message: 'Plantilla no encontrada' }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { nombre, descripcion, items, marginId } = await request.json();
    const updated = await db.presupuestoTemplate.update({
      where: { id },
      data: { nombre, descripcion, items, marginId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Plantilla no encontrada',
      conflict: 'Ya existe una plantilla con este nombre',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.presupuestoTemplate.delete({ where: { id } });
    return NextResponse.json({ message: 'Plantilla eliminada' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Plantilla no encontrada' });
  }
}
