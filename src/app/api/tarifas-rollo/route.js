import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tarifas = await db.tarifaRollo.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error('Error al obtener tarifas de rollo:', error);
    return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { material, espesor, ancho, color, metrajeMinimo, precioBase, peso } = await request.json();

    if (!material || espesor === undefined || precioBase === undefined || peso === undefined) {
      return NextResponse.json(
        { message: 'material, espesor, precioBase y peso son obligatorios' },
        { status: 400 }
      );
    }

    const tarifa = await db.tarifaRollo.create({
      data: {
        material: material.trim().toUpperCase(),
        espesor: parseFloat(espesor),
        ancho: ancho ? parseFloat(ancho) : null,
        color: color?.trim().toUpperCase() || null,
        metrajeMinimo: parseFloat(metrajeMinimo) || 10,
        precioBase: parseFloat(precioBase),
        peso: parseFloat(peso),
      },
    });
    return NextResponse.json(tarifa, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Ya existe una tarifa con ese material, espesor, color y ancho' },
        { status: 409 }
      );
    }
    console.error('Error al crear tarifa de rollo:', error);
    return NextResponse.json({ message: 'Error al crear la tarifa' }, { status: 500 });
  }
}
