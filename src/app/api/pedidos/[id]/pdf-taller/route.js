import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateTallerPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') return new NextResponse('ID requerido', { status: 400 });

    const valorado = request.nextUrl.searchParams.get('valorado') === '1';
    const host     = request.headers.get('host') || '192.168.1.250:3000';
    const pedidoUrl = `http://${host}/pedidos/${id}`;

    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        items: { include: { producto: { include: { material: true } } } },
      },
    });

    if (!order) return new NextResponse('Pedido no encontrado', { status: 404 });

    let margenRule = null;
    if (valorado && order.marginId) {
      margenRule = await db.reglaMargen.findUnique({ where: { id: order.marginId } });
    }

    const pdfBuffer = await generateTallerPDF(order, { valorado, pedidoUrl, margenRule });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="taller-${order.numero}.pdf"`,
      },
    });

  } catch (error) {
    logApiError(error, 'Error al generar PDF de taller');
    return new NextResponse(JSON.stringify({ message: 'Error interno' }), { status: 500 });
  }
}
