import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateAlbaranPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const albaran = await db.albaran.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true, nif: true, telefono: true } },
        items: { include: { producto: { select: { id: true, nombre: true } } } },
      },
    });

    if (!albaran) return new NextResponse('Albarán no encontrado', { status: 404 });

    const pdfBuffer = await generateAlbaranPDF(albaran);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="albaran-${albaran.numero}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error al generar PDF de albarán');
    return new NextResponse(JSON.stringify({ message: 'Error interno' }), { status: 500 });
  }
}
