import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/plantillas/[id] - Es un alias de /api/productos/[id]
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const producto = await db.producto.findUnique({
      where: { id: id },
      include: {
        fabricante: true,
        material: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener producto' }, { status: 500 });
  }
}
