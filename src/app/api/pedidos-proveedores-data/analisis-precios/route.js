import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/pedidos-proveedores-data/analisis-precios?material=PVC
// Devuelve el histórico de precios por proveedor para un material dado.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');

    // Listar materiales disponibles si no se pasa uno
    if (!material) {
      const materiales = await db.pedidoProveedor.findMany({
        distinct: ['material'],
        select: { material: true },
        orderBy: { material: 'asc' },
      });
      return NextResponse.json({ materiales: materiales.map(m => m.material) });
    }

    // Obtener todos los pedidos de ese material con sus bobinas y proveedor
    const pedidos = await db.pedidoProveedor.findMany({
      where: { material: { contains: material } },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        bobinas: {
          include: { referencia: { select: { referencia: true, ancho: true } } },
        },
      },
      orderBy: { fecha: 'asc' },
      take: 500,
    });

    // Agrupar puntos por proveedor
    const byProveedor = {};

    for (const pedido of pedidos) {
      const pId   = pedido.proveedor.id;
      const pNom  = pedido.proveedor.nombre;
      if (!byProveedor[pId]) {
        byProveedor[pId] = { proveedorId: pId, nombre: pNom, puntos: [] };
      }

      for (const b of pedido.bobinas) {
        if (!b.precioMetro || b.precioMetro <= 0) continue;
        byProveedor[pId].puntos.push({
          fecha:        pedido.fecha,
          pedidoId:     pedido.id,
          precioMetro:  b.precioMetro,
          espesor:      b.espesor ?? null,
          ancho:        b.ancho ?? null,
          referencia:   b.referencia?.referencia ?? null,
          tipo:         pedido.tipo,
          tasaCambio:   pedido.tasaCambio || 1,
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
        precioMin:    parseFloat(Math.min(...p.puntos.map(x => x.precioMetro)).toFixed(4)),
        precioMax:    parseFloat(Math.max(...p.puntos.map(x => x.precioMetro)).toFixed(4)),
      }))
      .sort((a, b) => a.ultimoPrecio - b.ultimoPrecio); // el más barato primero

    return NextResponse.json({ material, proveedores: result });
  } catch (error) {
    logApiError(error, 'GET /api/pedidos-proveedores-data/analisis-precios');
    return NextResponse.json({ message: 'Error al obtener el análisis' }, { status: 500 });
  }
}
