import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// GET /api/plantillas/[id] - Alias de /api/productos/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const producto = await db.producto.findUnique({ where: { id } });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    const { costoUnitario: _c, ...productoSafe } = producto;
    return NextResponse.json(productoSafe);
  } catch (error) {
    return handlePrismaError(error);
  }
}
