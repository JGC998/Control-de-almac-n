import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET() {
  try {
    const grapas = await db.grapa.findMany({
      where: { activo: true },
      orderBy: [{ fabricante: 'asc' }, { nombre: 'asc' }],
    });
    return NextResponse.json(grapas);
  } catch (error) {
    return handlePrismaError(error);
  }
}

export async function POST(request) {
  try {
    const { nombre, fabricante, descripcion, precioMetro } = await request.json();
    if (!nombre || precioMetro === undefined) {
      return NextResponse.json({ message: 'nombre y precioMetro son obligatorios' }, { status: 400 });
    }
    const grapa = await db.grapa.create({
      data: {
        nombre: nombre.trim(),
        fabricante: fabricante?.trim() || null,
        descripcion: descripcion?.trim() || null,
        precioMetro: parseFloat(precioMetro),
      },
    });
    return NextResponse.json(grapa, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, { conflict: 'Ya existe una grapa con ese nombre' });
  }
}

export async function PUT(request) {
  try {
    const { updates } = await request.json();
    if (!Array.isArray(updates)) {
      return NextResponse.json({ message: 'Se requiere un array de updates' }, { status: 400 });
    }
    const results = await Promise.all(
      updates.map(({ id, precioMetro }) =>
        db.grapa.update({ where: { id }, data: { precioMetro: parseFloat(precioMetro) } })
      )
    );
    return NextResponse.json({ message: `${results.length} grapas actualizadas`, updated: results });
  } catch (error) {
    return handlePrismaError(error);
  }
}
