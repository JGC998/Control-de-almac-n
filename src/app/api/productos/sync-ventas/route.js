import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// POST /api/productos/sync-ventas
// Recalcula unidadesVendidas para todos los productos sumando
// cantidades de PedidoItems en pedidos no Cancelados.
export async function POST() {
  try {
    const items = await db.pedidoItem.groupBy({
      by: ['productoId'],
      where: {
        productoId: { not: null },
        pedido: { estado: { not: 'Cancelado' } },
      },
      _sum: { quantity: true },
    });

    if (items.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    await db.$transaction(
      items.map(item =>
        db.producto.update({
          where: { id: item.productoId },
          data: { unidadesVendidas: item._sum.quantity ?? 0 },
        })
      )
    );

    revalidatePath('/gestion/productos');
    return NextResponse.json({ updated: items.length });
  } catch (error) {
    logApiError(error, 'POST /api/productos/sync-ventas');
    return NextResponse.json({ message: 'Error al sincronizar ventas' }, { status: 500 });
  }
}
