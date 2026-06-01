import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXCLUIDOS = ['Cancelado', 'Borrador'];

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const items = await db.pedidoItem.findMany({
      where: {
        pedido: {
          clienteId: id,
          estado: { notIn: EXCLUIDOS },
        },
      },
      select: {
        descripcion: true,
        quantity: true,
        unitPrice: true,
        productoId: true,
        pedido: { select: { fechaCreacion: true, numero: true } },
      },
      orderBy: { pedido: { fechaCreacion: 'desc' } },
      take: 5000,
    });

    // Agrupar por descripcion
    const byDesc = {};
    for (const item of items) {
      const key = item.productoId || item.descripcion;
      if (!byDesc[key]) {
        byDesc[key] = {
          descripcion: item.descripcion,
          productoId: item.productoId || null,
          precios: [],
          fechas: [],
        };
      }
      byDesc[key].precios.push(item.unitPrice);
      byDesc[key].fechas.push(item.pedido.fechaCreacion);
    }

    const historial = Object.values(byDesc).map(g => {
      const sorted = g.precios;
      const min = Math.min(...sorted);
      const max = Math.max(...sorted);
      const avg = sorted.reduce((s, p) => s + p, 0) / sorted.length;
      return {
        descripcion: g.descripcion,
        productoId: g.productoId,
        ultimoPrecio: sorted[0],
        precioMedio: parseFloat(avg.toFixed(4)),
        precioMin: min,
        precioMax: max,
        numVeces: sorted.length,
        ultimaFecha: g.fechas[0],
      };
    });

    // Ordenar por número de veces (los más frecuentes primero)
    historial.sort((a, b) => b.numVeces - a.numVeces);

    return NextResponse.json(historial);
  } catch (error) {
    logApiError(error, 'GET /api/clientes/[id]/historial-precios');
    return NextResponse.json({ error: 'Error al obtener historial de precios' }, { status: 500 });
  }
}
