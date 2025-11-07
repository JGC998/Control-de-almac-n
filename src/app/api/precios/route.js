import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/precios
export async function GET() {
  try {
    const tarifas = await db.tarifaMaterial.findMany({
      orderBy: [
        { material: 'asc' }, // CORREGIDO: 'material' es un String, no una relación.
        { espesor: 'asc' }
      ],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// Se eliminó el handler PUT para que esta API sea de solo lectura
