import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { getMargenes } from '@/lib/config-cache';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const doceAtras = new Date();
    doceAtras.setMonth(doceAtras.getMonth() - 12);

    const [cliente, pedidos, presupuestos, margenes, totalAgg, numPedidosTotal, numPresupuestosTotal, pedidosItems] = await Promise.all([
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
      db.pedidoItem.findMany({
        where: {
          pedido: {
            clienteId: id,
            estado: { notIn: ['Cancelado', 'Borrador'] },
            fechaCreacion: { gte: doceAtras },
          },
        },
        select: { descripcion: true, quantity: true, unitPrice: true, pedido: { select: { fechaCreacion: true } } },
      }),
    ]);

    if (!cliente) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });

    const margenMap = Object.fromEntries(margenes.map(m => [m.id, m]));

    const pedidosEnriquecidos = pedidos.map(p => ({
      ...p,
      margen: p.marginId ? margenMap[p.marginId] ?? null : null,
    }));

    const totalFacturado = Number(totalAgg._sum.total ?? 0);
    const ultimoPedido = pedidos.length > 0 ? pedidos[0].fechaCreacion : null;

    // Facturación mensual últimos 12 meses (de más antiguo a más reciente)
    const facturacionMensual = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const añoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label  = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      const total  = pedidos
        .filter(p => {
          if (['Cancelado', 'Borrador'].includes(p.estado)) return false;
          const fm = new Date(p.fechaCreacion);
          return `${fm.getFullYear()}-${String(fm.getMonth() + 1).padStart(2, '0')}` === añoMes;
        })
        .reduce((s, p) => s + Number(p.total ?? 0), 0);
      facturacionMensual.push({ mes: label, total: parseFloat(total.toFixed(2)) });
    }

    // Top 3 productos por cantidad en últimos 12 meses
    const mapaProductos = {};
    pedidosItems.forEach(item => {
      const key = item.descripcion;
      if (!mapaProductos[key]) mapaProductos[key] = { descripcion: key, cantidad: 0, totalEuros: 0 };
      mapaProductos[key].cantidad   += Number(item.quantity ?? 0);
      mapaProductos[key].totalEuros += Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
    });
    const topProductos = Object.values(mapaProductos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3)
      .map(p => ({ ...p, totalEuros: parseFloat(p.totalEuros.toFixed(2)) }));

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
      facturacionMensual,
      topProductos,
    });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
