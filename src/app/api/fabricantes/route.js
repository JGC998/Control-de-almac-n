import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fabricantes - Obtiene todos los fabricantes
export async function GET() {
  try {
    const fabricantes = await db.fabricante.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(fabricantes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener fabricantes' }, { status: 500 });
  }
}

// POST /api/fabricantes - Añade un nuevo fabricante
export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const nuevoFabricante = await db.fabricante.create({
      data: {
        nombre: data.nombre,
      },
    });
    return NextResponse.json(nuevoFabricante, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') { // Error de unicidad
      return NextResponse.json({ message: 'El fabricante ya existe' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al crear fabricante' }, { status: 500 });
  }
}