import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handlePrismaError } from '@/lib/manejadores-api';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const historial = await db.historialPrecioGrapa.findMany({
      where: { modeloGrapaId: parseInt(id) },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });
    return NextResponse.json(historial);
  } catch (error) {
    return handlePrismaError(error);
  }
}
