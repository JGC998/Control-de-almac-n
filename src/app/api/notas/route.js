import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { z } from 'zod';

const notaSchema = z.object({ content: z.string().min(1, 'El contenido es requerido').max(2000, 'Máximo 2000 caracteres') });

export const dynamic = 'force-dynamic';

// GET /api/notas (Obtener las últimas 20 notas)
export async function GET() {
  try {
    const notas = await db.nota.findMany({
      orderBy: { fecha: 'desc' },
      take: 20,
    });
    return NextResponse.json(notas);
  } catch (error) {
    logApiError(error, 'GET /api/notas');
    return NextResponse.json({ message: 'Error al obtener notas' }, { status: 500 });
  }
}

// POST /api/notas (Crear una nueva nota)
export async function POST(request) {
  try {
    const parsed = notaSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const newNote = await db.nota.create({ data: { content: parsed.data.content } });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/notas');
    return NextResponse.json({ message: 'Error al crear la nota' }, { status: 500 });
  }
}

// DELETE /api/notas (Eliminar una nota por ID)
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: 'El ID de la nota es requerido' }, { status: 400 });
    }

    await db.nota.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Nota eliminada con éxito' }, { status: 200 });
  } catch (error) {
    logApiError(error, 'DELETE /api/notas');
    return NextResponse.json({ message: 'Error al eliminar la nota' }, { status: 500 });
  }
}