import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const EXCLUIDOS = ['Cancelado', 'Borrador'];

export async function GET(request) {
  // S9 — Rate limit: 20 peticiones/min por IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
  const rl = checkRateLimit(ip, 20);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    // ── Ventas mensuales ────────────────────────────────────────────────────
    if (tipo === 'ventas-mensuales') {
      const currentYear = new Date().getFullYear();
      const año = Math.max(2000, Math.min(currentYear, parseInt(searchParams.get('año') || String(currentYear), 10)));
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

      const [aggMes, aggMesAnterior, aggTotal, pedidosPendientes, presupuestosTotal, presupuestosAceptados] = await Promise.all([
        db.pedido.aggregate({
          where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicioMes } },
          _sum: { total: true },
          _count: { id: true },
        }),
        db.pedido.aggregate({
          where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicioMesAnterior, lt: inicioMes } },
          _sum: { total: true },
        }),
        db.pedido.aggregate({
          where: { estado: { notIn: EXCLUIDOS } },
          _avg: { total: true },
        }),
        db.pedido.count({ where: { estado: 'Pendiente' } }),
        db.presupuesto.count({ where: { estado: { notIn: EXCLUIDOS } } }),
        db.presupuesto.count({ where: { estado: 'Aceptado' } }),
      ]);

      const totalMes = aggMes._sum.total ?? 0;
      const totalMesAnterior = aggMesAnterior._sum.total ?? 0;
      const ticketMedio = aggTotal._avg.total ?? 0;
      const tasaConversion = presupuestosTotal > 0 ? (presupuestosAceptados / presupuestosTotal) * 100 : 0;

      return NextResponse.json({
        totalMes: parseFloat(totalMes.toFixed(2)),
        totalMesAnterior: parseFloat(totalMesAnterior.toFixed(2)),
        pedidosPendientes,
        ticketMedio: parseFloat(ticketMedio.toFixed(2)),
        tasaConversion: parseFloat(tasaConversion.toFixed(1)),
        numPedidosMes: aggMes._count.id,
      });
    }

    // ── Top clientes ────────────────────────────────────────────────────────
    if (tipo === 'top-clientes') {
      const agrupado = await db.pedido.groupBy({
        by: ['clienteId'],
        where: { estado: { notIn: EXCLUIDOS }, clienteId: { not: null } },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      });
      const clienteIds = agrupado.map(g => g.clienteId);
      const clientes = await db.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nombre: true },
      });
      const nombreMap = Object.fromEntries(clientes.map(c => [c.id, c.nombre]));
      const sorted = agrupado.map(g => ({
        clienteId: g.clienteId,
        nombre: nombreMap[g.clienteId] ?? '(sin cliente)',
        totalFacturado: parseFloat((g._sum.total ?? 0).toFixed(2)),
        numPedidos: g._count.id,
      }));
      return NextResponse.json(sorted);
    }

    // ── Ventas por producto ─────────────────────────────────────────────────
    if (tipo === 'ventas-por-producto') {
      const items = await db.pedidoItem.findMany({
        where: { pedido: { estado: { notIn: EXCLUIDOS } } },
        select: { descripcion: true, quantity: true, unitPrice: true, productoId: true },
        take: 5000,
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

    // ── Ventas por cliente ──────────────────────────────────────────────────
    if (tipo === 'ventas-por-cliente') {
      const clienteId = searchParams.get('clienteId');
      const desde     = searchParams.get('desde');
      const hasta     = searchParams.get('hasta');

      const where = { estado: { notIn: EXCLUIDOS } };
      if (clienteId) where.clienteId = clienteId;
      if (desde || hasta) {
        where.fechaCreacion = {};
        if (desde) where.fechaCreacion.gte = new Date(desde);
        if (hasta) { const h = new Date(hasta); h.setHours(23,59,59,999); where.fechaCreacion.lte = h; }
      }

      const pedidos = await db.pedido.findMany({
        where,
        select: {
          id: true, numero: true, fechaCreacion: true, total: true, estado: true,
          cliente: { select: { id: true, nombre: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
        take: 500,
      });

      const totalFacturado = pedidos.reduce((s, p) => s + (p.total ?? 0), 0);

      return NextResponse.json({
        pedidos: pedidos.map(p => ({
          id: p.id, numero: p.numero, estado: p.estado,
          fecha: p.fechaCreacion,
          cliente: p.cliente?.nombre ?? '—',
          clienteId: p.cliente?.id ?? null,
          total: parseFloat((p.total ?? 0).toFixed(2)),
        })),
        totalFacturado: parseFloat(totalFacturado.toFixed(2)),
        count: pedidos.length,
      });
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
    logApiError(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
