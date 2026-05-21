import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

// POST /api/albaranes/[id]/factura — genera una factura desde un albarán emitido
export async function POST(request, { params }) {
  try {
    const { id: albaranId } = await params;

    const factura = await db.$transaction(async (tx) => {
      const albaran = await tx.albaran.findUnique({
        where: { id: albaranId },
        include: { items: { include: { producto: true } }, cliente: true },
      });

      if (!albaran) throw new Error('Albarán no encontrado');
      if (albaran.estado === 'CANCELADO') throw new Error('No se puede facturar un albarán cancelado');

      const yaFacturado = await tx.factura.findUnique({ where: { albaranId } });
      if (yaFacturado) throw new Error('Este albarán ya tiene una factura generada');

      const numero = await getNextNumber('factura');

      // Fecha de vencimiento: 30 días desde hoy
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

      const created = await tx.factura.create({
        data: {
          numero,
          estado: 'BORRADOR',
          notas: albaran.notas,
          subtotal: albaran.subtotal,
          tax: albaran.tax,
          total: albaran.total,
          fechaVencimiento,
          ...(albaran.clienteId && { cliente: { connect: { id: albaran.clienteId } } }),
          albaran: { connect: { id: albaranId } },
          ...(albaran.pedidoId && { pedido: { connect: { id: albaran.pedidoId } } }),
          items: {
            create: albaran.items.map(item => ({
              descripcion:      item.descripcion,
              quantity:         item.quantity,
              unitPrice:        item.unitPrice,
              pesoUnitario:     item.pesoUnitario,
              detallesTecnicos: item.detallesTecnicos,
              ...(item.productoId && { producto: { connect: { id: item.productoId } } }),
            })),
          },
        },
        include: { items: true, cliente: true },
      });

      // Marcar albarán como entregado si estaba emitido
      if (albaran.estado === 'EMITIDO') {
        await tx.albaran.update({ where: { id: albaranId }, data: { estado: 'ENTREGADO' } });
      }

      return created;
    });

    revalidatePath('/facturas');
    revalidatePath(`/albaranes/${albaranId}`);
    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    console.error(error);
    const msg = !error.code && error.message ? error.message : 'Error interno';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
