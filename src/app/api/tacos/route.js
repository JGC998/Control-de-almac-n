import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { tacoSchema, tacoBatchUpdateSchema, validateData } from '@/lib/validations';

export async function GET() {
  try {
    const tacos = await db.taco.findMany({
      orderBy: [{ tipo: 'asc' }, { altura: 'asc' }],
    });
    return NextResponse.json(tacos);
  } catch (error) {
    logApiError(error, 'Error al obtener tacos:');
    return NextResponse.json({ message: 'Error al obtener tacos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateData(tacoSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { tipo, altura, precioMetro } = validation.data;
    const taco = await db.taco.create({
      data: { tipo, altura, precioMetro },
    });
    return NextResponse.json(taco, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe un taco con ese tipo y altura' }, { status: 409 });
    }
    logApiError(error, 'Error al crear taco:');
    return NextResponse.json({ message: 'Error al crear el taco' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const validation = validateData(tacoBatchUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { updates } = validation.data;
    const results = await db.$transaction(
      updates.map(({ id, precioMetro }) =>
        db.taco.update({ where: { id }, data: { precioMetro } })
      )
    );
    return NextResponse.json({ message: `${results.length} tacos actualizados`, updated: results });
  } catch (error) {
    logApiError(error, 'Error al actualizar tacos:');
    return NextResponse.json({ message: 'Error al actualizar los tacos' }, { status: 500 });
  }
}
