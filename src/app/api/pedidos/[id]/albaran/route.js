import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

// POST /api/pedidos/[id]/albaran — genera un albarán a partir de un pedido confirmado
export async function POST(request, { params }) {
  try {
    const { id: pedidoId } = await params;
    const body = await request.json().catch(() => ({}));
    const valorado = body.valorado !== false; // default true

    // Validaciones fuera de la transacción
    const pedido = await db.pedido.findUnique({
      where: { id: pedidoId },
      include: { items: { include: { producto: true } }, cliente: true },
    });

    if (!pedido) return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    if (pedido.estado === 'Cancelado') {
      return NextResponse.json({ message: 'No se puede generar albarán de un pedido cancelado' }, { status: 422 });
    }

    const albExistente = await db.albaran.findFirst({ where: { pedidoId }, select: { numero: true } });
    if (albExistente) {
      return NextResponse.json(
        { message: `Este pedido ya tiene un albarán generado (${albExistente.numero})` },
        { status: 422 }
      );
    }

    // getNextNumber fuera de la transacción (evita conflicto de bloqueo en SQLite)
    const numero = await getNextNumber('albaran');

    const albaran = await db.$transaction(async (tx) => {
      // Re-leer dentro de la transacción para consistencia
      const pedidoTx = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { items: { include: { producto: true } }, cliente: true },
      });

      const created = await tx.albaran.create({
        data: {
          numero,
          estado: 'BORRADOR',
          valorado,
          notas: pedidoTx.notas,
          subtotal: pedidoTx.subtotal,
          tax: pedidoTx.tax,
          total: pedidoTx.total,
          ...(pedidoTx.clienteId && { cliente: { connect: { id: pedidoTx.clienteId } } }),
          pedido: { connect: { id: pedidoId } },
          items: {
            create: pedidoTx.items.map(item => ({
              descripcion: item.descripcion,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              pesoUnitario: item.pesoUnitario,
              detallesTecnicos: item.detallesTecnicos,
              ...(item.productoId && { producto: { connect: { id: item.productoId } } }),
            })),
          },
        },
        include: { items: true, cliente: true },
      });

      // El pedido permanece en "Pendiente" hasta que se genere la factura

      return created;
    });

    revalidatePath('/albaranes');
    revalidatePath(`/pedidos/${pedidoId}`);
    return NextResponse.json(albaran, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
