import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/estrella-medidas?productoId=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('productoId');
    if (!productoId) {
      return NextResponse.json({ message: 'productoId requerido' }, { status: 400 });
    }
    const medidas = await db.estrellaMedida.findMany({
      where: { productoId },
      orderBy: { creadoEn: 'asc' },
    });
    return NextResponse.json(medidas);
  } catch (error) {
    logApiError(error, 'GET /api/estrella-medidas');
    return NextResponse.json({ message: 'Error al obtener medidas' }, { status: 500 });
  }
}

// POST /api/estrella-medidas
export async function POST(request) {
  try {
    const { productoId, ancho, largo, cantidad, descripcion } = await request.json();
    if (!productoId || !ancho || !largo || !cantidad) {
      return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }
    const medida = await db.estrellaMedida.create({
      data: {
        productoId,
        ancho: parseFloat(ancho),
        largo: parseFloat(largo),
        cantidad: parseInt(cantidad, 10),
        descripcion: descripcion?.trim() || null,
      },
    });
    return NextResponse.json(medida, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/estrella-medidas');
    return NextResponse.json({ message: 'Error al crear medida' }, { status: 500 });
  }
}
