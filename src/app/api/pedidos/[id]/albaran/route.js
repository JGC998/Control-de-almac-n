import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

// POST /api/pedidos/[id]/albaran — genera un albarán a partir de un pedido confirmado
export async function POST(request, { params }) {
  try {
    const { id: pedidoId } = await params;

    const albaran = await db.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { items: { include: { producto: true } }, cliente: true },
      });

      if (!pedido) throw new Error('Pedido no encontrado');

      if (['Cancelado'].includes(pedido.estado)) {
        throw new Error('No se puede generar albarán de un pedido cancelado');
      }

      const numero = await getNextNumber('albaran');

      const created = await tx.albaran.create({
        data: {
          numero,
          estado: 'BORRADOR',
          notas: pedido.notas,
          subtotal: pedido.subtotal,
          tax: pedido.tax,
          total: pedido.total,
          ...(pedido.clienteId && { cliente: { connect: { id: pedido.clienteId } } }),
          pedido: { connect: { id: pedidoId } },
          items: {
            create: pedido.items.map(item => ({
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

      // Marcar el pedido como En preparación si estaba Pendiente
      if (pedido.estado === 'Pendiente') {
        await tx.pedido.update({
          where: { id: pedidoId },
          data: { estado: 'En preparación' },
        });
      }

      return created;
    });

    revalidatePath('/albaranes');
    revalidatePath(`/pedidos/${pedidoId}`);
    return NextResponse.json(albaran, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = !error.code && error.message ? error.message : 'Error interno';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
