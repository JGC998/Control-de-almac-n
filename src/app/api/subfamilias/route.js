import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { subfamiliaSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const familiaId = searchParams.get('familiaId');

    const subfamilias = await db.subfamilia.findMany({
      where: familiaId ? { familiaId } : undefined,
      orderBy: { nombre: 'asc' },
      include: { familia: true },
    });
    return NextResponse.json(subfamilias);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = subfamiliaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message, details: parsed.error.issues },
        { status: 400 }
      );
    }
    const subfamilia = await db.subfamilia.create({
      data: parsed.data,
      include: { familia: true },
    });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json(subfamilia, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, { conflict: 'Ya existe una subfamilia con ese nombre en esta familia.' });
  }
}
