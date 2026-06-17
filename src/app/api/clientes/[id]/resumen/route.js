import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { getMargenes } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [cliente, pedidos, presupuestos, margenes, totalAgg, numPedidosTotal, numPresupuestosTotal] = await Promise.all([
      db.cliente.findUnique({ where: { id } }),
      db.pedido.findMany({
        where: { clienteId: id },
        orderBy: { fechaCreacion: 'desc' },
        take: 50,
      }),
      db.presupuesto.findMany({
        where: { clienteId: id },
        select: {
          id: true, numero: true, estado: true,
          total: true, subtotal: true, tax: true,
          fechaCreacion: true, notas: true, marginId: true,
        },
        orderBy: { fechaCreacion: 'desc' },
        take: 50,
      }),
      getMargenes(),
      db.pedido.aggregate({
        where: { clienteId: id, estado: { notIn: ['Cancelado', 'Borrador'] } },
        _sum: { total: true },
      }),
      db.pedido.count({ where: { clienteId: id } }),
      db.presupuesto.count({ where: { clienteId: id } }),
    ]);

    if (!cliente) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });

    const margenMap = Object.fromEntries(margenes.map(m => [m.id, m]));

    const pedidosEnriquecidos = pedidos.map(p => ({
      ...p,
      margen: p.marginId ? margenMap[p.marginId] ?? null : null,
    }));

    const totalFacturado = totalAgg._sum.total ?? 0;
    const ultimoPedido = pedidos.length > 0 ? pedidos[0].fechaCreacion : null;

    return NextResponse.json({
      cliente,
      pedidos: pedidosEnriquecidos,
      presupuestos,
      stats: {
        totalFacturado,
        numPedidos: numPedidosTotal,
        numPresupuestos: numPresupuestosTotal,
        ultimoPedido,
      },
    });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
