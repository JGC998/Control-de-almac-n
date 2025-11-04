import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notas
export async function GET() {
  try {
    const notas = await db.nota.findMany({
      orderBy: { fecha: 'desc' },
      take: 20,
    });
    return NextResponse.json(notas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener notas' }, { status: 500 });
  }
}

// POST /api/notas
export async function POST(request) {
  try {
    const { content } = await request.json();
    if (!content) {
      return NextResponse.json({ message: 'El contenido es requerido' }, { status: 400 });
    }

    const newNote = await db.nota.create({
      data: { content },
    });
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear la nota' }, { status: 500 });
  }
}
