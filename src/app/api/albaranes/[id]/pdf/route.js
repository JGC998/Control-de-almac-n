import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateAlbaranPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') return new NextResponse('ID requerido', { status: 400 });

    const albaran = await db.albaran.findUnique({
      where: { id },
      include: {
        cliente: true,
        pedido: { select: { id: true, numero: true } },
        items: { include: { producto: true } },
      },
    });

    if (!albaran) return new NextResponse('Albarán no encontrado', { status: 404 });

    const pdfBuffer = await generateAlbaranPDF(albaran);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="albaran-${albaran.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error al generar PDF del albarán:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno al generar el PDF' }), { status: 500 });
  }
}
