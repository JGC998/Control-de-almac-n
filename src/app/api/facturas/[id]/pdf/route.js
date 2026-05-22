import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateFacturaPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') return new NextResponse('ID requerido', { status: 400 });

    const factura = await db.factura.findUnique({
      where: { id },
      include: {
        cliente: true,
        albaran: { select: { id: true, numero: true } },
        pedido:  { select: { id: true, numero: true } },
        items:   { include: { producto: true } },
        facturaOriginal: { select: { id: true, numero: true, fechaHoraGenRegistro: true, fechaCreacion: true } },
      },
    });

    if (!factura) return new NextResponse('Factura no encontrada', { status: 404 });

    const pdfBuffer = await generateFacturaPDF(factura);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${factura.numero}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'Error al generar PDF de factura');
    return new NextResponse(JSON.stringify({ message: 'Error interno al generar el PDF' }), { status: 500 });
  }
}
