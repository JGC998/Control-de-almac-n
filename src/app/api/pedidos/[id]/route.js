import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError } from '@/lib/manejadores-api';
import { pedidoSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET: Obtener un pedido específico por ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;


    const order = await db.pedido.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true, direccion: true, tier: true } },
        presupuesto: { select: { id: true, numero: true, estado: true, total: true } },
        items: {
          orderBy: { descripcion: 'asc' },
          include: {
            producto: { select: { id: true, nombre: true, referenciaFabricante: true } },
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
    logApiError(error, 'Error al obtener pedido');
    return NextResponse.json({ message: "Error interno al obtener pedido" }, { status: 500 });
  }
}

// PUT: Actualizar un pedido existente (Incluye actualización de estado y sincronización de caché)
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const body = await request.json();
    // API-01: Validar con el mismo schema Zod que el POST
    const parsed = pedidoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { clienteId, items, notas, estado, marginId } = parsed.data;
    const { presupuestoId } = body; // no está en el schema pero se permite en edición

    // Recalcular totales en servidor con IVA desde Config
    const configIva = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const taxRate = configIva ? parseFloat(configIva.value) / 100 : 0.21;
    const subtotal = parseFloat(items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toFixed(2));
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

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
        productoId: item.productoId || null,
        detallesTecnicos: item.detallesTecnicos || null,
        pedidoId: id,
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
          cliente: { select: { id: true, nombre: true, email: true, telefono: true, direccion: true, tier: true } },
          presupuesto: { select: { id: true, numero: true, estado: true, total: true } },
          items: {
            include: { producto: { select: { id: true, nombre: true, referenciaFabricante: true } } },
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
    return handlePrismaError(error, { notFound: 'El pedido o un registro relacionado no fue encontrado.' });
  }
}

// PATCH: Actualizaciones parciales (sinFacturacion, estado)
export async function PATCH(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise;
    const updates = await request.json();
    const allowed = {};
    if (typeof updates.sinFacturacion === 'boolean') allowed.sinFacturacion = updates.sinFacturacion;
    if (updates.estado) allowed.estado = updates.estado;

    if (!Object.keys(allowed).length) {
      return NextResponse.json({ message: 'Sin campos válidos' }, { status: 400 });
    }

    const updated = await db.pedido.update({ where: { id }, data: allowed });
    revalidatePath('/pedidos');
    revalidatePath(`/pedidos/${id}`);
    return NextResponse.json(updated);
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Pedido no encontrado' });
  }
}

// DELETE: Eliminar un pedido
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.pedido.delete({ where: { id } });
    revalidatePath('/pedidos');
    return NextResponse.json({ message: 'Pedido eliminado correctamente' });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Pedido no encontrado' });
  }
}