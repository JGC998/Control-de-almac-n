import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/plantillas - Es un alias de /api/productos
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      include: {
        fabricante: true,
        material: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}
