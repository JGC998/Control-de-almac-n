import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/descuentos
export async function GET() {
  try {
    const data = await db.reglaDescuento.findMany({ include: { tiers: true } });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener descuentos' }, { status: 500 });
  }
}

// POST /api/pricing/descuentos
export async function POST(request) {
  try {
    const data = await request.json();
    // (Faltaría lógica para crear tiers anidados si es necesario)
    const nuevaRegla = await db.reglaDescuento.create({ data });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear descuento' }, { status: 500 });
  }
}
