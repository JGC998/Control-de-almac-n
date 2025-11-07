import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/configuracion/referencias
export async function GET() {
  try {
    const referencias = await db.referenciaBobina.findMany({
      orderBy: { referencia: 'asc' }, // CORREGIDO: Usamos el campo de Prisma 'referencia'
    });
    return NextResponse.json(referencias);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener referencias' }, { status: 500 });
  }
}

// POST /api/configuracion/referencias
export async function POST(request) {
  try {
    const data = await request.json();
    const { nombre, ancho, lonas, pesoPorMetroLineal } = data; // AHORA ACEPTA MÁS CAMPOS

    if (!nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const nuevaReferencia = await db.referenciaBobina.create({
      data: {
        referencia: nombre, // Mapeado en schema.prisma a 'nombre'
        ancho: parseFloat(ancho) || 0,
        lonas: parseInt(lonas) || 0,
        pesoPorMetroLineal: parseFloat(pesoPorMetroLineal) || 0,
      },
    });
    return NextResponse.json(nuevaReferencia, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') { // Error de unicidad
      return NextResponse.json({ message: 'Ya existe una referencia con este nombre' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al crear referencia' }, { status: 500 });
  }
}
