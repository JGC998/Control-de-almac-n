import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { familiaSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const familias = await db.familia.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        subfamilias: {
          orderBy: { nombre: 'asc' },
          include: { _count: { select: { productos: true, articulos: true } } },
        },
      },
    });
    return NextResponse.json(familias);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message, details: parsed.error.issues },
        { status: 400 }
      );
    }
    const familia = await db.familia.create({ data: parsed.data });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json(familia, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, { conflict: 'Ya existe una familia con ese nombre.' });
  }
}
