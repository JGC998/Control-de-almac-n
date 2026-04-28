import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [cliente, pedidos, presupuestos, margenes] = await Promise.all([
      db.cliente.findUnique({ where: { id } }),
      db.pedido.findMany({
        where: { clienteId: id },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.presupuesto.findMany({
        where: { clienteId: id },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.reglaMargen.findMany(),
    ]);

    if (!cliente) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });

    const margenMap = Object.fromEntries(margenes.map(m => [m.id, m]));

    const pedidosEnriquecidos = pedidos.map(p => ({
      ...p,
      margen: p.marginId ? margenMap[p.marginId] ?? null : null,
    }));

    const estados_excluidos = ['Cancelado', 'Borrador'];
    const pedidosFacturados = pedidos.filter(p => !estados_excluidos.includes(p.estado));
    const totalFacturado = pedidosFacturados.reduce((sum, p) => sum + (p.total ?? 0), 0);
    const ultimoPedido = pedidos.length > 0 ? pedidos[0].fechaCreacion : null;

    return NextResponse.json({
      cliente,
      pedidos: pedidosEnriquecidos,
      presupuestos,
      stats: {
        totalFacturado,
        numPedidos: pedidos.length,
        numPresupuestos: presupuestos.length,
        ultimoPedido,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
