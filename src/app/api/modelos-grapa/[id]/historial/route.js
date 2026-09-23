import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    const historial = await db.historialPrecioGrapa.findMany({
      where: { modeloGrapaId: numId },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });
    return NextResponse.json(historial);
  } catch (error) {
    return handlePrismaError(error);
  }
}
