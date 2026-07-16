import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
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

    // BUG-07: getNextNumber debe llamarse FUERA de la transacción para evitar
    // SQLITE_BUSY en dev y deadlocks en MySQL (secuencia usa su propio upsert atómico).
    const newOrderNumber = await getNextNumber('pedido');

    // Usamos una transacción para asegurar que ambas operaciones (crear pedido y actualizar presupuesto)
    // ocurran correctamente o fallen juntas.
    const newPedido = await db.$transaction(async (tx) => {
      // 1. Obtener el presupuesto y sus items
      const quote = await tx.presupuesto.findUnique({
        where: { id: presupuestoId },
        include: { items: true },
      });

      if (!quote) {
        throw Object.assign(new Error('Presupuesto no encontrado'), { status: 404 });
      }

      // Actualización atómica para evitar TOCTOU (doble click / dos pestañas)
      const marcado = await tx.presupuesto.updateMany({
        where: { id: presupuestoId, estado: { notIn: ['Aceptado'] } },
        data: { estado: 'Aceptado' },
      });
      if (marcado.count === 0) {
        throw Object.assign(new Error('Este presupuesto ya ha sido aceptado y convertido en pedido'), { status: 409 });
      }

      // 3. Crear el nuevo pedido copiando los datos
      const createdPedido = await tx.pedido.create({
        data: {
          numero: newOrderNumber,
          fechaCreacion: new Date().toISOString(),
          estado: 'Pendiente',

          // BUG-01: si el presupuesto no tiene cliente, no intentar connect con id null
          ...(quote.clienteId ? { cliente: { connect: { id: quote.clienteId } } } : {}),

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
              detallesTecnicos: item.detallesTecnicos ?? null,
            })),
          },
        },
      });

      // 4. Estado ya actualizado atómicamente arriba (BUG-10)

      return createdPedido;
    });

    revalidatePath('/pedidos');
    revalidatePath('/presupuestos');
    revalidatePath(`/presupuestos/${presupuestoId}`);
    return NextResponse.json(newPedido, { status: 201 });

  } catch (error) {
    // Errores de negocio con status explícito (404, 409…)
    if (error.status && !error.code) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    logApiError(error, 'Error al convertir presupuesto a pedido:');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}