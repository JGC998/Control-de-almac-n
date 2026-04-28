import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    if (tipo === 'ventas-mensuales') {
      const pedidos = await db.pedido.findMany({
        where: { estado: { notIn: ['Cancelado', 'Borrador'] } },
        select: { fechaCreacion: true, total: true, subtotal: true },
        orderBy: { fechaCreacion: 'asc' },
      });

      const byMonth = {};
      for (const p of pedidos) {
        const d = new Date(p.fechaCreacion);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[key]) byMonth[key] = { mes: key, totalVentas: 0, numPedidos: 0 };
        byMonth[key].totalVentas += p.total ?? 0;
        byMonth[key].numPedidos += 1;
      }

      return NextResponse.json(Object.values(byMonth));
    }

    if (tipo === 'top-clientes') {
      const pedidos = await db.pedido.findMany({
        where: { estado: { notIn: ['Cancelado', 'Borrador'] }, clienteId: { not: null } },
        select: { clienteId: true, total: true, cliente: { select: { nombre: true } } },
      });

      const byCliente = {};
      for (const p of pedidos) {
        const key = p.clienteId;
        if (!byCliente[key]) byCliente[key] = { clienteId: key, nombre: p.cliente?.nombre ?? '(sin cliente)', totalFacturado: 0, numPedidos: 0 };
        byCliente[key].totalFacturado += p.total ?? 0;
        byCliente[key].numPedidos += 1;
      }

      const sorted = Object.values(byCliente).sort((a, b) => b.totalFacturado - a.totalFacturado);
      return NextResponse.json(sorted);
    }

    if (tipo === 'ventas-por-producto') {
      const items = await db.pedidoItem.findMany({
        where: { pedido: { estado: { notIn: ['Cancelado', 'Borrador'] } } },
        select: { descripcion: true, quantity: true, unitPrice: true, productoId: true },
      });

      const byProducto = {};
      for (const item of items) {
        const key = item.productoId ?? item.descripcion;
        if (!byProducto[key]) byProducto[key] = { descripcion: item.descripcion, productoId: item.productoId, cantidadTotal: 0, totalVentas: 0 };
        byProducto[key].cantidadTotal += item.quantity;
        byProducto[key].totalVentas += item.quantity * item.unitPrice;
      }

      const sorted = Object.values(byProducto).sort((a, b) => b.totalVentas - a.totalVentas);
      return NextResponse.json(sorted.slice(0, 50));
    }

    return NextResponse.json({ message: 'Tipo de informe no válido. Usa: ventas-mensuales, top-clientes, ventas-por-producto' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
