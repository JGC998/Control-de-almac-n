import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

// POST /api/albaranes/[id]/factura — genera una factura desde un albarán emitido
export async function POST(request, { params }) {
  try {
    const { id: albaranId } = await params;

    // Validaciones y número fuera de la transacción (evita conflicto de bloqueo en SQLite)
    const albaran = await db.albaran.findUnique({
      where: { id: albaranId },
      include: { items: { include: { producto: true } }, cliente: true },
    });

    if (!albaran) return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });
    if (albaran.estado === 'CANCELADO') return NextResponse.json({ message: 'No se puede facturar un albarán cancelado' }, { status: 422 });

    const yaFacturado = await db.factura.findUnique({ where: { albaranId } });
    if (yaFacturado) return NextResponse.json({ message: 'Este albarán ya tiene una factura generada' }, { status: 422 });

    const numero = await getNextNumber('factura');
    // Use Spain timezone so the 30-day term is calculated from the local business date
    const todayMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
    const fechaVencimiento = new Date(`${todayMadrid}T00:00:00.000Z`);
    fechaVencimiento.setUTCDate(fechaVencimiento.getUTCDate() + 30);

    const factura = await db.$transaction(async (tx) => {
      // Re-leer dentro de la transacción para consistencia
      const albaranTx = await tx.albaran.findUnique({
        where: { id: albaranId },
        include: { items: { include: { producto: true } }, cliente: true },
      });

      const created = await tx.factura.create({
        data: {
          numero,
          estado: 'BORRADOR',
          notas: albaranTx.notas,
          subtotal: albaranTx.subtotal,
          tax: albaranTx.tax,
          total: albaranTx.total,
          fechaVencimiento,
          ...(albaranTx.clienteId && { cliente: { connect: { id: albaranTx.clienteId } } }),
          albaran: { connect: { id: albaranId } },
          ...(albaranTx.pedidoId && { pedido: { connect: { id: albaranTx.pedidoId } } }),
          items: {
            create: albaranTx.items.map(item => ({
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

      if (albaranTx.estado === 'EMITIDO') {
        await tx.albaran.update({ where: { id: albaranId }, data: { estado: 'ENTREGADO' } });
      }

      if (albaranTx.pedidoId) {
        const totalAlbaranes = await tx.albaran.count({ where: { pedidoId: albaranTx.pedidoId } });
        const albaranesConFactura = await tx.albaran.count({
          where: { pedidoId: albaranTx.pedidoId, factura: { isNot: null } },
        });
        if (albaranesConFactura === totalAlbaranes) {
          await tx.pedido.update({ where: { id: albaranTx.pedidoId }, data: { estado: 'Facturado' } });
        }
      }

      return created;
    });

    revalidatePath('/facturas');
    revalidatePath(`/albaranes/${albaranId}`);
    if (albaran.pedidoId) revalidatePath(`/pedidos/${albaran.pedidoId}`);
    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
