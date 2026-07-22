import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { familiaSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const familias = await db.familia.findMany({
      include: { subfamilias: { orderBy: { nombre: 'asc' } } },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(familias);
  } catch (error) {
    logApiError(error, 'GET /api/familias');
    return NextResponse.json({ message: 'Error al obtener familias' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = familiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const familia = await db.familia.create({ data: parsed.data });
    revalidatePath('/gestion/catalogos/familias');
    return NextResponse.json(familia, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/familias');
    return NextResponse.json({ message: 'Error al crear familia' }, { status: 500 });
  }
}
