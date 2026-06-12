import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

// GET /api/pedidos-proveedores-data/analisis-precios?material=PVC
// Devuelve el histórico de precios por proveedor para un material dado.
export async function GET(request) {
  // SEC-01: rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(`analisis-precios:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');

    // SEC-03: validar longitud del parámetro
    if (material && (material.length > 100)) {
      return NextResponse.json({ message: 'Parámetro material inválido' }, { status: 400 });
    }

    // API-02: añadir take: 200 al listado de materiales
    if (!material) {
      const materiales = await db.pedidoProveedor.findMany({
        distinct: ['material'],
        select: { material: true },
        orderBy: { material: 'asc' },
        take: 200,
      });
      return NextResponse.json({ materiales: materiales.map(m => m.material) });
    }

    const TAKE = 500;
    const [pedidos, total] = await Promise.all([
      db.pedidoProveedor.findMany({
        where: { material: { contains: material } },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          bobinas: {
            include: { referencia: { select: { referencia: true, ancho: true } } },
          },
        },
        orderBy: { fecha: 'asc' },
        take: TAKE,
      }),
      db.pedidoProveedor.count({ where: { material: { contains: material } } }),
    ]);

    const byProveedor = {};

    for (const pedido of pedidos) {
      const pId  = pedido.proveedor.id;
      const pNom = pedido.proveedor.nombre;
      if (!byProveedor[pId]) {
        byProveedor[pId] = { proveedorId: pId, nombre: pNom, puntos: [] };
      }
      for (const b of pedido.bobinas) {
        if (!b.precioMetro || b.precioMetro <= 0) continue;
        byProveedor[pId].puntos.push({
          fecha:       pedido.fecha,
          pedidoId:    pedido.id,
          precioMetro: b.precioMetro,
          espesor:     b.espesor ?? null,
          ancho:       b.ancho ?? null,
          referencia:  b.referencia?.referencia ?? null,
          tipo:        pedido.tipo,
          tasaCambio:  pedido.tasaCambio || 1,
        });
      }
    }

    const result = Object.values(byProveedor)
      .filter(p => p.puntos.length > 0)
      .map(p => ({
        ...p,
        numPedidos:   new Set(p.puntos.map(x => x.pedidoId)).size,
        ultimaFecha:  p.puntos[p.puntos.length - 1]?.fecha,
        ultimoPrecio: p.puntos[p.puntos.length - 1]?.precioMetro,
        precioMedio:  parseFloat((p.puntos.reduce((s, x) => s + x.precioMetro, 0) / p.puntos.length).toFixed(4)),
        // BACK-03: reduce() en vez de Math.min/max con spread (evita stack overflow)
        precioMin: parseFloat(p.puntos.reduce((m, x) => Math.min(m, x.precioMetro), Infinity).toFixed(4)),
        precioMax: parseFloat(p.puntos.reduce((m, x) => Math.max(m, x.precioMetro), -Infinity).toFixed(4)),
      }))
      .sort((a, b) => a.ultimoPrecio - b.ultimoPrecio);

    // BACK-02: flag de truncamiento
    return NextResponse.json({ material, proveedores: result, truncated: total > TAKE });
  } catch (error) {
    logApiError(error, 'GET /api/pedidos-proveedores-data/analisis-precios');
    return NextResponse.json({ message: 'Error al obtener el análisis' }, { status: 500 });
  }
}
