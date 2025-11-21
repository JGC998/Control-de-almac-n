import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache'; 
import { calculateTotalsBackend } from '@/lib/pricing-utils';

export const dynamic = 'force-dynamic';

// GET: Obtener un pedido específico por ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    console.log(`[PEDIDOS-API:GET] Solicitando pedido: ${id}`); // Debug log
    const order = await db.pedido.findUnique({
      where: { id: id },
      include: {
        cliente: true,
        items: {
          include: {
            producto: true,
          }
        },
      },
    });

    if (!order) {
      console.log(`[PEDIDOS-API:GET] Pedido ${id} no encontrado.`); // Debug log
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error al leer el pedido:', error);
    return NextResponse.json({ message: 'Error interno al leer los datos' }, { status: 500 });
  }
}

// PUT: Actualizar un pedido existente (Incluye actualización de estado y sincronización de caché)
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    const data = await request.json();
    const { items, ...rest } = data; // 'rest' contiene datos y objetos de relación

    console.log(`[PEDIDOS-API:PUT] Iniciando actualización de pedido: ${id}`);
    console.log(`[PEDIDOS-API:PUT] Nuevo estado solicitado: ${rest.estado}`); // Debug log

    // 1. CREAR OBJETO DE ACTUALIZACIÓN LIMPIO (Solo campos escalares/claves foráneas)
    const updateData = {
        // Campos escalares y claves foráneas permitidas por el modelo Pedido
        numero: rest.numero,
        fechaCreacion: rest.fechaCreacion,
        estado: rest.estado, // <-- El estado se actualiza aquí
        notas: rest.notas,
        subtotal: rest.subtotal, 
        tax: rest.tax,
        total: rest.total,
        clienteId: rest.clienteId,
        presupuestoId: rest.presupuestoId,
        marginId: rest.marginId,
    };

    const transaction = await db.$transaction(async (tx) => {

      // 1. Actualizar datos principales del pedido
      const updatedOrder = await tx.pedido.update({
        where: { id: id },
        data: updateData, // Usamos los datos limpios
      });

      // 2. Eliminar todos los items antiguos
      await tx.pedidoItem.deleteMany({
        where: { pedidoId: id },
      });

      // 3. Crear todos los items nuevos
      if (items && items.length > 0) {
        await tx.pedidoItem.createMany({
          data: items.map(item => ({
            descripcion: item.descripcion, // Usamos item.descripcion
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

    // --- FIX CRÍTICO: REVALIDAR LA RUTA DE LISTADO DESDE EL API ---
    revalidatePath('/pedidos');
    console.log(`[PEDIDOS-API:PUT] Revalidación de caché para '/pedidos' ejecutada.`); // Debug log
    // -------------------------------------------------------------

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error(`[PEDIDOS-API:PUT] ERROR CRÍTICO:`, error);
    // Devolvemos un mensaje genérico para evitar exponer detalles internos al cliente.
    return NextResponse.json({ message: 'Error al actualizar el pedido: Revise los logs del servidor para más detalles.' }, { status: 500 });
  }
}

// DELETE: Eliminar un pedido
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 
    console.log(`[PEDIDOS-API:DELETE] Eliminando pedido: ${id}`); // Debug log

    await db.$transaction(async (tx) => {
      await tx.pedidoItem.deleteMany({
        where: { pedidoId: id },
      });
      await tx.pedido.delete({
        where: { id: id },
      });
    });
    
    // Revalidamos la lista tras eliminar
    revalidatePath('/pedidos');
    console.log(`[PEDIDOS-API:DELETE] Pedido eliminado y caché revalidada.`); // Debug log

    return NextResponse.json({ message: 'Pedido eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al eliminar los datos' }, { status: 500 });
  }
}