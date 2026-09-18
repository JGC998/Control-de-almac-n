import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/estrellas — productos con "estrella" en nombre o subfamilia
export async function GET() {
  try {
    const productos = await db.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: 'ESTRELLA' } },
          { subfamilia: { nombre: { contains: 'ESTRELLA' } } },
        ],
      },
      include: {
        subfamilia: {
          include: { familia: { select: { nombre: true, color: true } } },
        },
        material: { select: { nombre: true } },
        _count: { select: { estrellaMedidas: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    logApiError(error, 'GET /api/estrellas');
    return NextResponse.json({ message: 'Error al obtener estrellas' }, { status: 500 });
  }
}
