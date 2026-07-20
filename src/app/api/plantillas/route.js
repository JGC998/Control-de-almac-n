import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/plantillas - Es un alias de /api/productos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      orderBy: { nombre: 'asc' },
      take: 500,
    });
    return NextResponse.json(productos.map(({ costoUnitario: _c, ...p }) => p));
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}
