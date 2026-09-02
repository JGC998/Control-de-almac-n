import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const TOLERANCIA_ANCHO = 50;   // mm
const TOLERANCIA_LARGO = 500;  // mm — mayor tolerancia para largo

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId     = searchParams.get('clienteId');
    const clienteNombre = searchParams.get('clienteNombre');
    const ancho         = searchParams.get('ancho');
    const largo         = searchParams.get('largo');

    const modo = searchParams.get('modo'); // 'clientes' | null

    const wherePedido = {
      estado: { not: 'Cancelado' },
    };

    if (clienteId) {
      wherePedido.clienteId = clienteId;
    } else if (clienteNombre) {
      wherePedido.cliente = { nombre: { contains: clienteNombre } };
    }

    // ── Modo clientes: devuelve clientes distintos con nº de bandas ───────────
    if (modo === 'clientes') {
      const raw = await db.pedidoItem.findMany({
        where: {
          detallesTecnicos: { not: null },
          pedido: wherePedido,
        },
        select: {
          detallesTecnicos: true,
          pedido: { select: { cliente: { select: { id: true, nombre: true } } } },
        },
        take: 500,
      });

      const mapa = new Map();
      for (const item of raw) {
        let det;
        try { det = JSON.parse(item.detallesTecnicos); } catch { continue; }
        if (!det?.dimensiones) continue;
        const cli = item.pedido?.cliente;
        if (!cli) continue;
        if (!mapa.has(cli.id)) mapa.set(cli.id, { id: cli.id, nombre: cli.nombre, count: 0 });
        mapa.get(cli.id).count++;
      }

      const clientes = [...mapa.values()].sort((a, b) => b.count - a.count);
      return NextResponse.json(clientes);
    }

    // ── Modo bandas (por defecto) ─────────────────────────────────────────────
    const items = await db.pedidoItem.findMany({
      where: {
        detallesTecnicos: { not: null },
        pedido: wherePedido,
      },
      select: {
        id: true,
        descripcion: true,
        unitPrice: true,
        pesoUnitario: true,
        detallesTecnicos: true,
        pedido: {
          select: {
            numero: true,
            fechaCreacion: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: [{ pedido: { fechaCreacion: 'desc' } }],
      take: 150,
    });

    // Filtrar solo items con dimensiones (bandas PVC)
    const bandas = items.flatMap(item => {
      let det;
      try { det = JSON.parse(item.detallesTecnicos); } catch { return []; }
      if (!det?.dimensiones) return [];
      return [{ id: item.id, descripcion: item.descripcion, unitPrice: item.unitPrice, pesoUnitario: item.pesoUnitario, det, pedido: item.pedido }];
    });

    // Filtro por dimensiones aproximadas
    if (ancho && largo) {
      const anchoN = Number(ancho);
      const largoN = Number(largo);
      const filtradas = bandas.filter(b => {
        const d = b.det.dimensiones;
        return Math.abs((d.ancho ?? 0) - anchoN) <= TOLERANCIA_ANCHO
            && Math.abs((d.largo ?? 0) - largoN) <= TOLERANCIA_LARGO;
      });
      return NextResponse.json(filtradas);
    }

    return NextResponse.json(bandas);
  } catch (error) {
    logApiError(error, 'GET /api/bandas-historial');
    return NextResponse.json({ error: 'Error al obtener historial de bandas' }, { status: 500 });
  }
}
