import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const factura = await db.factura.findUnique({
      where: { id },
      include: {
        cliente: true,
        albaran: { select: { id: true, numero: true, estado: true } },
        pedido:  { select: { id: true, numero: true, estado: true } },
        items:   { include: { producto: true } },
      },
    });

    if (!factura) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    return NextResponse.json(factura);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener factura' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, notas, fechaVencimiento } = body;

    const existing = await db.factura.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    // Una factura emitida o pagada es inmutable (preparación para VeriFactu)
    if (['EMITIDA', 'PAGADA'].includes(existing.estado) && estado !== existing.estado) {
      if (!['PAGADA', 'CANCELADA'].includes(estado)) {
        return NextResponse.json(
          { message: `No se puede modificar una factura en estado ${existing.estado}` },
          { status: 422 }
        );
      }
    }
    if (existing.estado === 'CANCELADA') {
      return NextResponse.json(
        { message: 'No se puede modificar una factura cancelada' },
        { status: 422 }
      );
    }

    const factura = await db.factura.update({
      where: { id },
      data: {
        ...(estado           && { estado }),
        ...(notas !== undefined && { notas }),
        ...(fechaVencimiento && { fechaVencimiento: new Date(fechaVencimiento) }),
      },
      include: { items: true, cliente: true, albaran: true, pedido: true },
    });

    revalidatePath('/facturas');
    revalidatePath(`/facturas/${id}`);
    return NextResponse.json(factura);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar factura' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await db.factura.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    if (['EMITIDA', 'PAGADA'].includes(existing.estado)) {
      return NextResponse.json(
        { message: 'No se puede eliminar una factura emitida o pagada. Cancélala primero.' },
        { status: 422 }
      );
    }

    await db.factura.delete({ where: { id } });
    revalidatePath('/facturas');
    return NextResponse.json({ message: 'Factura eliminada' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al eliminar factura' }, { status: 500 });
  }
}
