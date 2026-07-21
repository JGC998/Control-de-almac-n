import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateOrderPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const inline = new URL(request.url).searchParams.get('inline') === 'true';
    if (!id || id === 'undefined') return new NextResponse('ID requerido', { status: 400 });

    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        items: { include: { producto: true } },
      },
    });

    if (!order) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }

    const configList = await db.config.findMany({ take: 100 });
    const config = configList.reduce((acc, s) => {
      const n = parseFloat(s.value);
      acc[s.key] = isNaN(n) ? s.value : n;
      return acc;
    }, {});

    const pdfBuffer = await generateOrderPDF(order, config);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="notatrabajo-${order.numero}.pdf"`,
      },
    });

  } catch (error) {
    logApiError(error, 'Error al generar el PDF (API)');
    return new NextResponse(JSON.stringify({ message: 'Error interno al generar el PDF' }), { status: 500 });
  }
}