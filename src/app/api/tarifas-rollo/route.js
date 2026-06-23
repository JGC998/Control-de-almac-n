import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { logCreate } from '@/lib/audit';
import { tarifaRolloSchema, validateData } from '@/lib/validations';

export async function GET() {
  try {
    const tarifas = await db.tarifaRollo.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
      take: 500,
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    logApiError(error, 'Error al obtener tarifas de rollo:');
    return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateData(tarifaRolloSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
    }
    const { material, espesor, ancho, color, metrajeMinimo, precioBase, peso } = validation.data;
    const tarifa = await db.tarifaRollo.create({
      data: {
        material: material.trim().toUpperCase(),
        espesor,
        ancho: ancho ?? null,
        color: color?.trim().toUpperCase() || null,
        metrajeMinimo: metrajeMinimo ?? 10,
        precioBase,
        peso,
      },
    });
    await logCreate('TarifaRollo', tarifa.id, tarifa, 'Admin');
    return NextResponse.json(tarifa, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: 'Ya existe una tarifa con ese material, espesor, color y ancho' },
        { status: 409 }
      );
    }
    logApiError(error, 'Error al crear tarifa de rollo:');
    return NextResponse.json({ message: 'Error al crear la tarifa' }, { status: 500 });
  }
}
