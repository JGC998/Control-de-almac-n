import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { familiaSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const familia = await db.familia.findUnique({
      where: { id },
      include: { subfamilias: { orderBy: { nombre: 'asc' } } },
    });
    if (!familia) return NextResponse.json({ message: 'Familia no encontrada' }, { status: 404 });
    return NextResponse.json(familia);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const familia = await db.familia.update({ where: { id }, data: parsed.data });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json(familia);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Familia no encontrada',
      conflict: 'Ya existe una familia con ese nombre.',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.familia.delete({ where: { id } });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json({ message: 'Familia eliminada' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Familia no encontrada',
      hasRelated: 'No se puede eliminar: la familia tiene subfamilias asociadas.',
    });
  }
}
