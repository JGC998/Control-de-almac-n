import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/materiales - Obtiene todos los materiales
export async function GET() {
  try {
    const materiales = await db.material.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(materiales);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener materiales' }, { status: 500 });
  }
}

// POST /api/materiales - Crea un nuevo material (CORREGIDO: Ahora en la ruta base)
export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const nuevoMaterial = await db.material.create({
      data: {
        nombre: data.nombre,
      },
    });
    return NextResponse.json(nuevoMaterial, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') { // Error de unicidad
      return NextResponse.json({ message: 'El material ya existe' }, { status: 409 });
    }
    console.error('Error al crear material:', error);
    return NextResponse.json({ message: 'Error al crear material' }, { status: 500 });
  }
}
