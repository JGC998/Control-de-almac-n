import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Obtener un pedido específico por ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const order = await db.pedido.findUnique({
      where: { id: id },
      include: {
        cliente: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error al leer el pedido:', error);
    return NextResponse.json({ message: 'Error interno al leer los datos' }, { status: 500 });
  }
}

// PUT: Actualizar un pedido existente
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const data = await request.json();
    const { items, ...updatedOrderData } = data;

    const transaction = await db.$transaction(async (tx) => {
      // 1. Actualizar datos principales del pedido
      const updatedOrder = await tx.pedido.update({
        where: { id: id },
        data: {
          ...updatedOrderData,
        },
      });

      // 2. Eliminar todos los items antiguos
      await tx.pedidoItem.deleteMany({
        where: { pedidoId: id },
      });

      // 3. Crear todos los items nuevos
      if (items && items.length > 0) {
        await tx.pedidoItem.createMany({
          data: items.map(item => ({
            descripcion: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pesoUnitario: item.pesoUnitario || 0,
            productoId: item.productId,
            pedidoId: id,
          })),
        });
      }

      return updatedOrder;
    });

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el pedido:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al actualizar los datos' }, { status: 500 });
  }
}

// DELETE: Eliminar un pedido
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO

    await db.$transaction(async (tx) => {
      await tx.pedidoItem.deleteMany({
        where: { pedidoId: id },
      });
      await tx.pedido.delete({
        where: { id: id },
      });
    });

    return NextResponse.json({ message: 'Pedido eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al eliminar los datos' }, { status: 500 });
  }
}
