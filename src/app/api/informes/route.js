import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXCLUIDOS = ['Cancelado', 'Borrador'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    // ── Ventas mensuales ────────────────────────────────────────────────────
    if (tipo === 'ventas-mensuales') {
      const año = parseInt(searchParams.get('año') || String(new Date().getFullYear()), 10);
      const comparar = searchParams.get('comparar') === 'true';

      const fetchYear = async (y) => {
        const inicio = new Date(`${y}-01-01T00:00:00.000Z`);
        const fin = new Date(`${y + 1}-01-01T00:00:00.000Z`);
        const pedidos = await db.pedido.findMany({
          where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicio, lt: fin } },
          select: { fechaCreacion: true, total: true },
          orderBy: { fechaCreacion: 'asc' },
        });
        const byMonth = {};
        for (const p of pedidos) {
          const d = new Date(p.fechaCreacion);
          const key = String(d.getMonth() + 1).padStart(2, '0');
          if (!byMonth[key]) byMonth[key] = { mes: key, totalVentas: 0, numPedidos: 0 };
          byMonth[key].totalVentas += p.total ?? 0;
          byMonth[key].numPedidos += 1;
        }
        return Object.values(byMonth).map(d => ({ ...d, totalVentas: parseFloat(d.totalVentas.toFixed(2)) }));
      };

      const actual = await fetchYear(año);

      if (comparar) {
        const anterior = await fetchYear(año - 1);
        const anteriorMap = Object.fromEntries(anterior.map(d => [d.mes, d]));
        const merged = actual.map(d => ({ ...d, totalVentasAnterior: anteriorMap[d.mes]?.totalVentas ?? 0 }));
        return NextResponse.json({ data: merged, año, añoAnterior: año - 1 });
      }

      return NextResponse.json({ data: actual, año });
    }

    // ── KPIs ────────────────────────────────────────────────────────────────
    if (tipo === 'kpis') {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);

      const [pedidosMes, pedidosMesAnterior, pedidosPendientes, todosPedidos, presupuestosTotal, presupuestosAceptados] = await Promise.all([
        db.pedido.findMany({
          where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicioMes } },
          select: { total: true },
        }),
        db.pedido.findMany({
          where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicioMesAnterior, lt: inicioMes } },
          select: { total: true },
        }),
        db.pedido.count({ where: { estado: 'Pendiente' } }),
        db.pedido.findMany({
          where: { estado: { notIn: EXCLUIDOS } },
          select: { total: true },
        }),
        db.presupuesto.count({ where: { estado: { notIn: EXCLUIDOS } } }),
        db.presupuesto.count({ where: { estado: 'Aceptado' } }),
      ]);

      const totalMes = pedidosMes.reduce((s, p) => s + (p.total ?? 0), 0);
      const totalMesAnterior = pedidosMesAnterior.reduce((s, p) => s + (p.total ?? 0), 0);
      const ticketMedio = todosPedidos.length > 0
        ? todosPedidos.reduce((s, p) => s + (p.total ?? 0), 0) / todosPedidos.length
        : 0;
      const tasaConversion = presupuestosTotal > 0 ? (presupuestosAceptados / presupuestosTotal) * 100 : 0;

      return NextResponse.json({
        totalMes: parseFloat(totalMes.toFixed(2)),
        totalMesAnterior: parseFloat(totalMesAnterior.toFixed(2)),
        pedidosPendientes,
        ticketMedio: parseFloat(ticketMedio.toFixed(2)),
        tasaConversion: parseFloat(tasaConversion.toFixed(1)),
        numPedidosMes: pedidosMes.length,
      });
    }

    // ── Top clientes ────────────────────────────────────────────────────────
    if (tipo === 'top-clientes') {
      const pedidos = await db.pedido.findMany({
        where: { estado: { notIn: EXCLUIDOS }, clienteId: { not: null } },
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

    // ── Ventas por producto ─────────────────────────────────────────────────
    if (tipo === 'ventas-por-producto') {
      const items = await db.pedidoItem.findMany({
        where: { pedido: { estado: { notIn: EXCLUIDOS } } },
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

    // ── Presupuestos sin respuesta ──────────────────────────────────────────
    if (tipo === 'presupuestos-sin-respuesta') {
      const dias = parseInt(searchParams.get('dias') || '14', 10);
      const limite = new Date();
      limite.setDate(limite.getDate() - dias);

      const presupuestos = await db.presupuesto.findMany({
        where: { estado: 'Enviado', fechaCreacion: { lte: limite } },
        select: {
          id: true, numero: true, total: true, fechaCreacion: true,
          cliente: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaCreacion: 'asc' },
      });

      return NextResponse.json(presupuestos.map(p => ({
        ...p,
        diasEspera: Math.floor((Date.now() - new Date(p.fechaCreacion).getTime()) / 86_400_000),
      })));
    }

    return NextResponse.json({ message: 'Tipo de informe no válido' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
