import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { subfamiliaSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const subfamilia = await db.subfamilia.findUnique({
      where: { id },
      include: { familia: true },
    });
    if (!subfamilia) return NextResponse.json({ message: 'Subfamilia no encontrada' }, { status: 404 });
    return NextResponse.json(subfamilia);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = subfamiliaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const subfamilia = await db.subfamilia.update({
      where: { id },
      data: parsed.data,
      include: { familia: true },
    });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json(subfamilia);
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Subfamilia no encontrada',
      conflict: 'Ya existe una subfamilia con ese nombre en esta familia.',
    });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.subfamilia.delete({ where: { id } });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json({ message: 'Subfamilia eliminada' });
  } catch (error) {
    return handlePrismaError(error, {
      notFound: 'Subfamilia no encontrada',
      hasRelated: 'No se puede eliminar: la subfamilia tiene productos asociados.',
    });
  }
}
