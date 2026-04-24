import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tacos = await db.taco.findMany({
      orderBy: [{ tipo: 'asc' }, { altura: 'asc' }],
    });
    return NextResponse.json(tacos);
  } catch (error) {
    console.error('Error al obtener tacos:', error);
    return NextResponse.json({ message: 'Error al obtener tacos' }, { status: 500 });
  }
}

// POST - Crear un nuevo tipo de taco
export async function POST(request) {
  try {
    const { tipo, altura, precioMetro } = await request.json();

    if (!tipo || !altura || precioMetro === undefined) {
      return NextResponse.json({ message: 'tipo, altura y precioMetro son obligatorios' }, { status: 400 });
    }
    if (!['RECTO', 'INCLINADO'].includes(tipo)) {
      return NextResponse.json({ message: 'tipo debe ser RECTO o INCLINADO' }, { status: 400 });
    }

    const taco = await db.taco.create({
      data: { tipo, altura: parseInt(altura), precioMetro: parseFloat(precioMetro) },
    });
    return NextResponse.json(taco, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Ya existe un taco con ese tipo y altura' }, { status: 409 });
    }
    console.error('Error al crear taco:', error);
    return NextResponse.json({ message: 'Error al crear el taco' }, { status: 500 });
  }
}

// PUT - Actualizar precios en lote
export async function PUT(request) {
  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ message: 'Se requiere un array de updates' }, { status: 400 });
    }

    const results = await Promise.all(
      updates.map(({ id, precioMetro }) => {
        if (!id || precioMetro === undefined || precioMetro < 0) {
          throw new Error(`Datos inválidos para taco ${id}`);
        }
        return db.taco.update({ where: { id }, data: { precioMetro } });
      })
    );

    return NextResponse.json({ message: `${results.length} tacos actualizados`, updated: results });
  } catch (error) {
    console.error('Error al actualizar tacos:', error);
    return NextResponse.json({ message: 'Error al actualizar los tacos' }, { status: 500 });
  }
}
