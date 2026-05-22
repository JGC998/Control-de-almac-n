import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const albaran = await db.albaran.findUnique({
      where: { id },
      include: {
        cliente: true,
        pedido:  { select: { id: true, numero: true, estado: true } },
        factura: { select: { id: true, numero: true, estado: true } },
        items:   { include: { producto: true } },
      },
    });

    if (!albaran) {
      return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });
    }

    return NextResponse.json(albaran);
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener albarán' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, notas, items } = body;

    const existing = await db.albaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });
    }

    // Estados inmutables una vez entregado o cancelado
    if (['ENTREGADO', 'CANCELADO'].includes(existing.estado) && estado !== existing.estado) {
      return NextResponse.json(
        { message: `No se puede modificar un albarán en estado ${existing.estado}` },
        { status: 422 }
      );
    }

    const updateData = {};
    if (estado) updateData.estado = estado;
    if (notas !== undefined) updateData.notas = notas;

    if (items) {
      const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
      const ivaConfig = await db.config.findUnique({ where: { key: 'iva_rate' } });
      const ivaRate = ivaConfig ? parseFloat(ivaConfig.value) : 0.21;
      updateData.subtotal = subtotal;
      updateData.tax = subtotal * ivaRate;
      updateData.total = subtotal + updateData.tax;

      await db.albaranItem.deleteMany({ where: { albaranId: id } });
      updateData.items = {
        create: items.map(i => ({
          descripcion: i.descripcion,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          pesoUnitario: i.pesoUnitario || 0,
          detallesTecnicos: i.detallesTecnicos || null,
          ...(i.productoId && { producto: { connect: { id: i.productoId } } }),
        })),
      };
    }

    const albaran = await db.albaran.update({
      where: { id },
      data: updateData,
      include: { items: true, cliente: true, pedido: true },
    });

    revalidatePath('/albaranes');
    revalidatePath(`/albaranes/${id}`);
    return NextResponse.json(albaran);
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al actualizar albarán' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await db.albaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Albarán no encontrado' }, { status: 404 });
    }

    if (existing.estado === 'EMITIDO') {
      return NextResponse.json(
        { message: 'No se puede eliminar un albarán emitido. Cancélalo primero.' },
        { status: 422 }
      );
    }

    await db.albaran.delete({ where: { id } });

    revalidatePath('/albaranes');
    return NextResponse.json({ message: 'Albarán eliminado' });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al eliminar albarán' }, { status: 500 });
  }
}
