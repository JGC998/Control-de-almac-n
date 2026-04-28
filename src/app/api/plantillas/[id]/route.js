import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// GET /api/plantillas/[id] - Es un alias de /api/productos/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const pId = parseInt(id);
    if (isNaN(pId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

    const producto = await db.producto.findUnique({ where: { id: pId } });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json(producto);
  } catch (error) {
    return handlePrismaError(error);
  }
}
