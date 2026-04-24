import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

// GET: Obtener un pedido específico por ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;


    // Incluimos las relaciones confirmadas en el modelo Pedido
    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        presupuesto: true, // Corregido a singular
        items: {
          orderBy: { descripcion: 'asc' },
          include: {
            producto: true, // Necesario para obtener los datos completos del producto
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    // Serializar Decimals a números
    const orderSerializado = {
      ...order,
      subtotal: order.subtotal ? Number(order.subtotal) : 0,
      tax: order.tax ? Number(order.tax) : 0,
      total: order.total ? Number(order.total) : 0,
      items: order.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
        pesoUnitario: item.pesoUnitario ? Number(item.pesoUnitario) : 0,
        quantity: item.quantity ? Number(item.quantity) : 0,
      })),
    };

    return NextResponse.json(orderSerializado);

  } catch (error) {
    console.error('Error al obtener pedido:', error);
    return NextResponse.json({ message: "Error interno al obtener pedido" }, { status: 500 });
  }
}

// PUT: Actualizar un pedido existente (Incluye actualización de estado y sincronización de caché)
export async function PUT(request, { params: paramsPromise }) {
  const { id } = await paramsPromise;
  try {
    const data = await request.json();
    const { clienteId, items, notas, subtotal, tax, total, estado, marginId, presupuestoId } = data;

    if (!clienteId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Datos incompletos. Se requiere clienteId y al menos un item.' }, { status: 400 });
    }

    const updatedOrder = await db.$transaction(async (tx) => {

      // 1. Eliminar todos los ítems antiguos del pedido
      await tx.pedidoItem.deleteMany({
        where: { pedidoId: id },
      });

      // 2. Crear los nuevos ítems
      const newItems = items.map(item => ({
        descripcion: item.descripcion,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        pesoUnitario: item.pesoUnitario || 0,
        productoId: item.productoId || null, // UUID, no parseInt
        pedidoId: id, // Asegura la referencia
      }));
      await tx.pedidoItem.createMany({ data: newItems });

      // 3. Actualizar los datos principales del pedido
      const order = await tx.pedido.update({
        where: { id: id },
        data: {
          clienteId: clienteId,
          notas: notas,
          subtotal: subtotal,
          tax: tax,
          total: total,
          estado: estado,
          marginId: marginId,
          presupuestoId: presupuestoId,
        },
        include: {
          cliente: true,
          presupuesto: true,
          items: {
            include: { producto: true },
          },
        },
      });
      return order;
    });

    // Serializar Decimals
    const orderSerializado = {
      ...updatedOrder,
      subtotal: updatedOrder.subtotal ? Number(updatedOrder.subtotal) : 0,
      tax: updatedOrder.tax ? Number(updatedOrder.tax) : 0,
      total: updatedOrder.total ? Number(updatedOrder.total) : 0,
      items: updatedOrder.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
        pesoUnitario: item.pesoUnitario ? Number(item.pesoUnitario) : 0,
        quantity: item.quantity ? Number(item.quantity) : 0,
      })),
    };

    return NextResponse.json(orderSerializado);

  } catch (error) {
    console.error(`Error al actualizar el pedido ${id}:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Error: El pedido o un registro relacionado no fue encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ message: "Error interno al actualizar pedido" }, { status: 500 });
  }
}

// DELETE: Eliminar un pedido
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;


    await db.pedido.delete({ where: { id } });

    revalidatePath('/pedidos');


    return NextResponse.json({ message: 'Pedido eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al eliminar los datos' }, { status: 500 });
  }
}