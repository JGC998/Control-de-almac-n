import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

// POST /api/pedidos/from-presupuesto - Crea un pedido desde un presupuesto
export async function POST(request) {
  try {
    const { presupuestoId } = await request.json();

    if (!presupuestoId) {
      return NextResponse.json({ message: 'Se requiere presupuestoId' }, { status: 400 });
    }

    // Usamos una transacción para asegurar que ambas operaciones (crear pedido y actualizar presupuesto)
    // ocurran correctamente o fallen juntas.
    const newPedido = await db.$transaction(async (tx) => {
      // 1. Obtener el presupuesto y sus items
      const quote = await tx.presupuesto.findUnique({
        where: { id: presupuestoId },
        include: { items: true },
      });

      if (!quote) {
        throw new Error('Presupuesto no encontrado');
      }

      if (quote.estado === 'Aceptado') {
        throw new Error('Este presupuesto ya ha sido aceptado y convertido en pedido');
      }

      // 2. Generar un nuevo número de pedido.
      const newOrderNumber = await getNextNumber('pedido');
      // Eliminamos la llamada a calculateTotalsBackend y usamos los totales almacenados en el quote (ya correctos)

      // 3. Crear el nuevo pedido copiando los datos
      const createdPedido = await tx.pedido.create({
        data: {
          numero: newOrderNumber,
          fechaCreacion: new Date().toISOString(),
          estado: 'Pendiente', // Estado inicial del pedido

          // FIX #1: Usar connect para la relación cliente
          cliente: { connect: { id: quote.clienteId } },

          // Se traspasan las notas del presupuesto al pedido
          notas: quote.notas,

          subtotal: quote.subtotal,
          tax: quote.tax,
          total: quote.total,

          presupuesto: { connect: { id: quote.id } },
          marginId: quote.marginId,

          items: {
            create: quote.items.map(item => ({
              descripcion: item.descripcion,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              pesoUnitario: item.pesoUnitario,
              productoId: item.productoId,
            })),
          },
        },
      });

      // 4. Actualizar el estado del presupuesto
      await tx.presupuesto.update({
        where: { id: presupuestoId },
        data: { estado: 'Aceptado' },
      });

      return createdPedido;
    });

    revalidatePath('/pedidos');
    revalidatePath('/presupuestos');
    revalidatePath(`/presupuestos/${presupuestoId}`);
    return NextResponse.json(newPedido, { status: 201 });

  } catch (error) {
    console.error('Error al convertir presupuesto a pedido:', error);
    // Los errores sin `code` son los que lanzamos nosotros (mensajes de negocio seguros)
    const msg = !error.code && error.message ? error.message : 'Error interno';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}