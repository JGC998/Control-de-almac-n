import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export const dynamic = 'force-dynamic';

// GET /api/productos/[id]/historial-costos
// Devuelve los últimos 50 cambios de costoUnitario del producto.
// NOTA: expone costoAntes/costoDespues (datos de coste interno). Protegido solo por PIN global.
// Si se implementan roles, restringir a administrador.
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const historial = await db.historialPrecioCosto.findMany({
      where: { productoId: id },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });

    return NextResponse.json(historial);
  } catch (error) {
    return handlePrismaError(error);
  }
}
