import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const EXCLUIDOS = ['Cancelado', 'Borrador'];

export async function GET(request) {
  // Rate limit: 20 peticiones/min por IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`informes:${ip}`, 20);
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
          take: 10000,
        });
        const byMonth = {};
        for (const p of pedidos) {
          const d = new Date(p.fechaCreacion);
          const key = String(d.getMonth() + 1).padStart(2, '0');
          if (!byMonth[key]) byMonth[key] = { mes: key, totalVentas: 0, numPedidos: 0 };
          byMonth[key].totalVentas += Number(p.total ?? 0);
          byMonth[key].numPedidos += 1;
        }
        return Object.values(byMonth).map(d => ({ ...d, totalVentas: parseFloat(d.totalVentas.toFixed(2)) }));
      };

      const [actual, anterior] = comparar
        ? await Promise.all([fetchYear(año), fetchYear(año - 1)])
        : [await fetchYear(año), null];

      if (comparar && anterior) {
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

      const totalMes = Number(aggMes._sum.total ?? 0);
      const totalMesAnterior = Number(aggMesAnterior._sum.total ?? 0);
      const ticketMedio = Number(aggTotal._avg.total ?? 0);
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
        totalFacturado: parseFloat(Number(g._sum.total ?? 0).toFixed(2)),
        numPedidos: g._count.id,
      }));
      return NextResponse.json(sorted);
    }

    // ── Ventas por producto ─────────────────────────────────────────────────
    if (tipo === 'ventas-por-producto') {
      const desde = searchParams.get('desde');
      const hasta = searchParams.get('hasta');
      const parseFechaVP = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };
      const currentYear = new Date().getFullYear();
      const defaultDesde = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      const whereVP = { pedido: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: parseFechaVP(desde) ?? defaultDesde } } };
      const hastaVP = parseFechaVP(hasta);
      if (hastaVP) { hastaVP.setHours(23,59,59,999); whereVP.pedido.fechaCreacion.lte = hastaVP; }

      const items = await db.pedidoItem.findMany({
        where: whereVP,
        select: { descripcion: true, quantity: true, unitPrice: true, productoId: true },
        take: 2000,
      });

      // BUG-03: unitPrice es el precio de COSTE introducido antes de aplicar el margen.
      // Se renombra totalVentas → totalCosteBase para reflejar la realidad del campo.
      // El precio de venta real está en pedido.total (margen ya aplicado), no en los items.
      const byProducto = {};
      for (const item of items) {
        const key = item.productoId ?? item.descripcion;
        if (!byProducto[key]) byProducto[key] = { descripcion: item.descripcion, productoId: item.productoId, cantidadTotal: 0, totalCosteBase: 0 };
        byProducto[key].cantidadTotal += Number(item.quantity);
        byProducto[key].totalCosteBase += Number(item.quantity) * Number(item.unitPrice);
      }

      const sorted = Object.values(byProducto).sort((a, b) => b.totalCosteBase - a.totalCosteBase);
      return NextResponse.json(sorted.slice(0, 50));
    }

    // ── Ventas por cliente ──────────────────────────────────────────────────
    if (tipo === 'ventas-por-cliente') {
      const clienteId = searchParams.get('clienteId');
      const desde     = searchParams.get('desde');
      const hasta     = searchParams.get('hasta');

      const parseFecha = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };

      const where = { estado: { notIn: EXCLUIDOS } };
      if (clienteId) where.clienteId = clienteId;
      if (desde || hasta) {
        where.fechaCreacion = {};
        const desdeDate = parseFecha(desde);
        const hastaDate = parseFecha(hasta);
        if (desdeDate) where.fechaCreacion.gte = desdeDate;
        if (hastaDate) { hastaDate.setHours(23,59,59,999); where.fechaCreacion.lte = hastaDate; }
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

      const totalFacturado = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0);

      return NextResponse.json({
        pedidos: pedidos.map(p => ({
          id: p.id, numero: p.numero, estado: p.estado,
          fecha: p.fechaCreacion,
          cliente: p.cliente?.nombre ?? '—',
          clienteId: p.cliente?.id ?? null,
          total: parseFloat(Number(p.total ?? 0).toFixed(2)),
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
        take: 100,
      });

      return NextResponse.json(presupuestos.map(p => ({
        ...p,
        diasEspera: Math.floor((Date.now() - new Date(p.fechaCreacion).getTime()) / 86_400_000),
      })));
    }

    // ── Margen real por pedido (T-39) ──────────────────────────────────────
    if (tipo === 'margen-pedidos') {
      const desde = searchParams.get('desde');
      const hasta = searchParams.get('hasta');

      const ivaConfig = await db.config.findUnique({ where: { key: 'iva_rate' } });
      const IVA_MARGEN = ivaConfig?.value ? parseFloat(String(ivaConfig.value)) : 0.21;

      const parseFechaMargen = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };
      const where = { estado: { notIn: EXCLUIDOS } };
      if (desde || hasta) {
        where.fechaCreacion = {};
        const desdeDate = parseFechaMargen(desde);
        const hastaDate = parseFechaMargen(hasta);
        if (desdeDate) where.fechaCreacion.gte = desdeDate;
        if (hastaDate) { hastaDate.setHours(23,59,59,999); where.fechaCreacion.lte = hastaDate; }
      }

      const pedidos = await db.pedido.findMany({
        where,
        select: {
          id: true, numero: true, fechaCreacion: true, estado: true, total: true,
          cliente: { select: { id: true, nombre: true } },
          items: { select: { quantity: true, unitPrice: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
        take: 2000,
      });

      const result = pedidos.map(p => {
        const totalSinIVA = Number(p.total ?? 0) / (1 + IVA_MARGEN);
        const totalCoste = (p.items ?? []).reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
        const margen = totalSinIVA - totalCoste;
        const pctMargen = totalSinIVA > 0 ? (margen / totalSinIVA * 100) : 0;
        return {
          id: p.id, numero: p.numero,
          fecha: p.fechaCreacion, estado: p.estado,
          clienteId: p.cliente?.id ?? null,
          clienteNombre: p.cliente?.nombre ?? '—',
          totalVenta: parseFloat(totalSinIVA.toFixed(2)),
          totalCoste: parseFloat(totalCoste.toFixed(2)),
          margen: parseFloat(margen.toFixed(2)),
          pctMargen: parseFloat(pctMargen.toFixed(1)),
        };
      });

      return NextResponse.json(result);
    }

    // ── Rentabilidad por cliente (T-40) ────────────────────────────────────
    if (tipo === 'rentabilidad-clientes') {
      const desdeRent = searchParams.get('desde');
      const hastaRent = searchParams.get('hasta');

      const parseFechaRent = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };
      const whereRent = { estado: { notIn: EXCLUIDOS }, clienteId: { not: null } };
      const desdeRentDate = parseFechaRent(desdeRent);
      const hastaRentDate = parseFechaRent(hastaRent);
      if (desdeRentDate || hastaRentDate) {
        whereRent.fechaCreacion = {};
        if (desdeRentDate) whereRent.fechaCreacion.gte = desdeRentDate;
        if (hastaRentDate) { hastaRentDate.setHours(23,59,59,999); whereRent.fechaCreacion.lte = hastaRentDate; }
      } else {
        const currentYearRent = new Date().getFullYear();
        whereRent.fechaCreacion = { gte: new Date(`${currentYearRent}-01-01T00:00:00.000Z`) };
      }

      const ivaConfigRent = await db.config.findUnique({ where: { key: 'iva_rate' } });
      const IVA_RENT = ivaConfigRent?.value ? parseFloat(String(ivaConfigRent.value)) : 0.21;

      const pedidos = await db.pedido.findMany({
        where: whereRent,
        select: {
          id: true, total: true,
          cliente: { select: { id: true, nombre: true } },
          items: { select: { quantity: true, unitPrice: true } },
        },
        take: 2000,
      });

      const byCliente = {};

      for (const p of pedidos) {
        const cid = p.cliente?.id;
        if (!cid) continue;
        if (!byCliente[cid]) {
          byCliente[cid] = {
            clienteId: cid,
            nombre: p.cliente.nombre,
            numPedidos: 0,
            totalFacturado: 0,
            totalCoste: 0,
          };
        }
        const totalSinIVA = Number(p.total ?? 0) / (1 + IVA_RENT);
        const totalCoste = (p.items ?? []).reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
        byCliente[cid].numPedidos += 1;
        byCliente[cid].totalFacturado += totalSinIVA;
        byCliente[cid].totalCoste += totalCoste;
      }

      const result = Object.values(byCliente).map(c => ({
        ...c,
        totalFacturado: parseFloat(c.totalFacturado.toFixed(2)),
        totalCoste: parseFloat(c.totalCoste.toFixed(2)),
        margen: parseFloat((c.totalFacturado - c.totalCoste).toFixed(2)),
        pctMargen: c.totalFacturado > 0
          ? parseFloat(((c.totalFacturado - c.totalCoste) / c.totalFacturado * 100).toFixed(1))
          : 0,
      })).sort((a, b) => b.margen - a.margen);

      return NextResponse.json(result);
    }

    // ── Margen real vs coste real (Feature: compara costoUnitario vs venta) ──
    if (tipo === 'margen-real') {
      const desde = searchParams.get('desde');
      const hasta = searchParams.get('hasta');
      const parseFecha = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };

      const where = { estado: { notIn: EXCLUIDOS } };
      if (desde || hasta) {
        where.fechaCreacion = {};
        const desdeDate = parseFecha(desde);
        const hastaDate = parseFecha(hasta);
        if (desdeDate) where.fechaCreacion.gte = desdeDate;
        if (hastaDate) { hastaDate.setHours(23,59,59,999); where.fechaCreacion.lte = hastaDate; }
      } else {
        where.fechaCreacion = { gte: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`) };
      }

      const [pedidos, ivaConfig, reglasMargenes] = await Promise.all([
        db.pedido.findMany({
          where,
          select: {
            id: true, numero: true, fechaCreacion: true, estado: true, total: true,
            cliente: { select: { id: true, nombre: true } },
            items: { select: { id: true, descripcion: true, quantity: true, unitPrice: true, productoId: true } },
          },
          orderBy: { fechaCreacion: 'desc' },
          take: 500,
        }),
        db.config.findUnique({ where: { key: 'iva_rate' } }),
        db.reglaMargen.findMany({ take: 50 }),
      ]);

      const IVA = ivaConfig?.value ? parseFloat(String(ivaConfig.value)) : 0.21;

      // Recopilar todos los productoIds para obtener costoUnitario en una sola query
      const productoIds = [...new Set(
        pedidos.flatMap(p => p.items.map(i => i.productoId).filter(Boolean))
      )];
      const productosMap = new Map();
      if (productoIds.length > 0) {
        const productos = await db.producto.findMany({
          where: { id: { in: productoIds } },
          select: { id: true, costoUnitario: true, nombre: true },
        });
        for (const p of productos) productosMap.set(p.id, p);
      }

      // Margen mínimo de todas las ReglaMargen (para umbral de alerta)
      const margenMinimoMultiplicador = reglasMargenes.length > 0
        ? Math.min(...reglasMargenes.map(r => r.multiplicador))
        : 1.0;

      const result = pedidos.map(p => {
        const ventaSinIVA = Number(p.total ?? 0) / (1 + IVA);
        let costoReal = 0;
        let itemsConCosto = 0;
        let totalItems = p.items.length;

        for (const item of p.items) {
          if (item.productoId) {
            const prod = productosMap.get(item.productoId);
            if (prod?.costoUnitario != null) {
              costoReal += Number(prod.costoUnitario) * Number(item.quantity);
              itemsConCosto++;
            } else {
              // Sin costoUnitario: usar unitPrice como proxy
              costoReal += Number(item.unitPrice) * Number(item.quantity);
            }
          } else {
            costoReal += Number(item.unitPrice) * Number(item.quantity);
          }
        }

        const margenReal = ventaSinIVA - costoReal;
        const pctMargenReal = ventaSinIVA > 0 ? (margenReal / ventaSinIVA * 100) : 0;
        // Precio mínimo esperado si se aplicara la ReglaMargen más baja
        const costeBase = Number(p.items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0));
        const ventaEsperadaMinima = costeBase * margenMinimoMultiplicador;
        const bajoPrecio = ventaSinIVA < ventaEsperadaMinima;

        return {
          id: p.id, numero: p.numero, fecha: p.fechaCreacion, estado: p.estado,
          clienteId: p.cliente?.id ?? null,
          clienteNombre: p.cliente?.nombre ?? '—',
          ventaSinIVA: parseFloat(ventaSinIVA.toFixed(2)),
          costoReal: parseFloat(costoReal.toFixed(2)),
          margenReal: parseFloat(margenReal.toFixed(2)),
          pctMargenReal: parseFloat(pctMargenReal.toFixed(1)),
          itemsConCosto, totalItems, bajoPrecio,
        };
      });

      return NextResponse.json({
        pedidos: result,
        reglasMargenes: reglasMargenes.map(r => ({ id: r.id, base: r.base, multiplicador: r.multiplicador, gastoFijo: r.gastoFijo })),
        margenMinimoMultiplicador,
      });
    }

    return NextResponse.json({ message: 'Tipo de informe no válido' }, { status: 400 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
