import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/proveedores/[id]/stats
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const proveedor = await db.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }

    const pedidos = await db.pedidoProveedor.findMany({
      where: { proveedorId: id },
      include: {
        bobinas: { select: { cantidad: true, precioMetro: true, espesor: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    const totalPedidos = pedidos.length;
    const totalBobinas = pedidos.reduce((s, p) => s + p.bobinas.reduce((bs, b) => bs + b.cantidad, 0), 0);
    const totalGastos  = pedidos.reduce((s, p) => s + (p.gastosTotales ?? 0), 0);
    const ultimoPedido = pedidos[0]?.fecha ?? null;
    const primerPedido = pedidos.length > 0 ? pedidos[pedidos.length - 1].fecha : null;

    // Materiales más comprados
    const matCount = {};
    for (const p of pedidos) {
      matCount[p.material] = (matCount[p.material] ?? 0) + p.bobinas.reduce((s, b) => s + b.cantidad, 0);
    }
    const materialesMasComprados = Object.entries(matCount)
      .map(([material, bobinas]) => ({ material, bobinas }))
      .sort((a, b) => b.bobinas - a.bobinas)
      .slice(0, 5);

    // Últimos 10 pedidos (sin bobinas para la tabla)
    const ultimosPedidos = pedidos.slice(0, 10).map(p => ({
      id: p.id,
      fecha: p.fecha,
      material: p.material,
      estado: p.estado,
      gastosTotales: p.gastosTotales,
      tipo: p.tipo,
      numBobinas: p.bobinas.reduce((s, b) => s + b.cantidad, 0),
      numeroContenedor: p.numeroContenedor,
    }));

    return NextResponse.json({
      proveedor,
      stats: {
        totalPedidos,
        totalBobinas,
        totalGastos,
        ultimoPedido,
        primerPedido,
        materialesMasComprados,
      },
      ultimosPedidos,
    });
  } catch (error) {
    logApiError(error, 'GET /api/proveedores/[id]/stats');
    return NextResponse.json({ message: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
