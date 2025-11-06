import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  try {
    const data = await request.json();
    const nuevaRegla = await db.reglaMargen.create({
      data: {
        descripcion: data.descripcion,
        tipo: data.tipo,
        categoria: data.categoria,
        valor: parseFloat(data.valor),
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear margen' }, { status: 500 });
  }
}
