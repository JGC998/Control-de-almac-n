import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

const templateUpdateSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  items: z.array(z.any()).optional(),
  marginId: z.string().uuid().optional().nullable(),
});

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
    const body = await request.json();
    const parsed = templateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const updated = await db.presupuestoTemplate.update({
      where: { id },
      data: parsed.data,
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
