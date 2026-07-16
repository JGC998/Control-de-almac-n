import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { generateBatchTallerPDF } from '@/lib/pdfGenerator';

export const dynamic = 'force-dynamic';

// POST /api/pedidos/pdf-taller-batch
// Body: { ids: string[] }
export async function POST(request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ message: 'Se requiere al menos un ID de pedido' }, { status: 400 });
    }

    const orders = await db.pedido.findMany({
      where: { id: { in: ids } },
      include: {
        cliente: true,
        items: { include: { producto: { include: { material: true } } } },
      },
      // Preservar el orden solicitado
      orderBy: { fechaCreacion: 'desc' },
    });

    // Reordenar según el array ids original para respetar la selección del usuario
    const orderMap = new Map(orders.map(o => [o.id, o]));
    const ordered  = ids.map(id => orderMap.get(id)).filter(Boolean);

    const pdfBuffer = await generateBatchTallerPDF(ordered);

    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="notas-taller-${fecha}.pdf"`,
      },
    });

  } catch (error) {
    logApiError(error, 'Error al generar PDF batch de taller');
    return NextResponse.json({ message: 'Error interno al generar el PDF' }, { status: 500 });
  }
}
