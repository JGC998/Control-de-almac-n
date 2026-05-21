import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const emisor = await db.configuracionEmisor.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, nif: '', nombre: '', direccion: '', entorno: 'pruebas' },
    });
    return NextResponse.json(emisor);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener configuración del emisor' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { nif, nombre, direccion, entorno } = await request.json();

    const emisor = await db.configuracionEmisor.upsert({
      where: { id: 1 },
      update: {
        ...(nif       !== undefined && { nif: nif.trim() }),
        ...(nombre    !== undefined && { nombre: nombre.trim() }),
        ...(direccion !== undefined && { direccion: direccion.trim() }),
        ...(entorno   !== undefined && { entorno }),
      },
      create: {
        id: 1,
        nif:      (nif       || '').trim(),
        nombre:   (nombre    || '').trim(),
        direccion:(direccion || '').trim(),
        entorno:  entorno || 'pruebas',
      },
    });

    return NextResponse.json(emisor);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al guardar configuración del emisor' }, { status: 500 });
  }
}
