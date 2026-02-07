import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOrderPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = params;

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

    const pdfBuffer = await generateOrderPDF(order);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="notatrabajo-${order.numero}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF (API):', error);
    return new NextResponse(JSON.stringify({
      message: 'Error interno al generar el PDF',
      error: error.message
    }), { status: 500 });
  }
}