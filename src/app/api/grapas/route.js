import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';
import { grapaSchema, grapaUpdateSchema, validateData } from '@/lib/validations';

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
    const body = await request.json();
    const validation = validateData(grapaSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { nombre, fabricante, descripcion, precioMetro } = validation.data;
    const grapa = await db.grapa.create({
      data: {
        nombre: nombre.trim(),
        fabricante: fabricante?.trim() || null,
        descripcion: descripcion?.trim() || null,
        precioMetro,
      },
    });
    return NextResponse.json(grapa, { status: 201 });
  } catch (error) {
    return handlePrismaError(error, { conflict: 'Ya existe una grapa con ese nombre' });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const validation = validateData(grapaUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { updates } = validation.data;
    const results = await Promise.all(
      updates.map(({ id, precioMetro }) =>
        db.grapa.update({ where: { id }, data: { precioMetro } })
      )
    );
    return NextResponse.json({ message: `${results.length} grapas actualizadas`, updated: results });
  } catch (error) {
    return handlePrismaError(error);
  }
}
