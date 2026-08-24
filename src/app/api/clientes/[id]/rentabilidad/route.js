import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const pedidos = await db.pedido.findMany({
      where: {
        clienteId: id,
        estado: { notIn: ['Cancelado', 'Borrador'] },
      },
      select: {
        id: true,
        numero: true,
        fechaCreacion: true,
        subtotal: true,
        reglaMargen: { select: { multiplicador: true, descripcion: true } },
        items: { select: { unitPrice: true, quantity: true } },
      },
      orderBy: { fechaCreacion: 'asc' },
    });

    if (pedidos.length === 0) {
      return NextResponse.json({ pedidos: [], resumen: null });
    }

    const pedidosConMargen = pedidos.map(p => {
      const costeTotal = p.items.reduce((sum, it) => sum + Number(it.unitPrice) * Number(it.quantity), 0);
      const ventaTotal = Number(p.subtotal);
      const beneficio  = ventaTotal - costeTotal;
      const margenPct  = ventaTotal > 0 ? (beneficio / ventaTotal) * 100 : 0;
      return {
        id: p.id,
        numero: p.numero,
        fecha: p.fechaCreacion,
        coste: parseFloat(costeTotal.toFixed(2)),
        venta: parseFloat(ventaTotal.toFixed(2)),
        beneficio: parseFloat(beneficio.toFixed(2)),
        margenPct: parseFloat(margenPct.toFixed(1)),
      };
    });

    const totCoste     = pedidosConMargen.reduce((s, p) => s + p.coste, 0);
    const totVenta     = pedidosConMargen.reduce((s, p) => s + p.venta, 0);
    const totBeneficio = totVenta - totCoste;
    const margenMedio  = totVenta > 0 ? (totBeneficio / totVenta) * 100 : 0;

    return NextResponse.json({
      pedidos: pedidosConMargen,
      resumen: {
        totalCoste:     parseFloat(totCoste.toFixed(2)),
        totalVenta:     parseFloat(totVenta.toFixed(2)),
        totalBeneficio: parseFloat(totBeneficio.toFixed(2)),
        margenMedioPct: parseFloat(margenMedio.toFixed(1)),
        numPedidos:     pedidosConMargen.length,
      },
    });
  } catch (error) {
    logApiError(error, 'GET /api/clientes/[id]/rentabilidad');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
