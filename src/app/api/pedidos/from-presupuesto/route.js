import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { calculateTotalsBackend } from '@/lib/pricing-utils'; 

/**
 * Genera el siguiente número secuencial para un pedido (ej. PED-2025-001)
 */
async function getNextPedidoNumber(tx) {
  const dbClient = tx || db;
  const year = new Date().getFullYear();
  const prefix = `PED-${year}-`;

  const lastPedido = await dbClient.pedido.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  });

  let nextNum = 1;
  if (lastPedido) {
    const numberPart = lastPedido.numero.split('-')[2];
    nextNum = parseInt(numberPart, 10) + 1;
  }
  
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

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
      const newOrderNumber = await getNextPedidoNumber(tx);
      // Eliminamos la llamada a calculateTotalsBackend y usamos los totales almacenados en el quote (ya correctos)

      // 3. Crear el nuevo pedido copiando los datos
      const createdPedido = await tx.pedido.create({
        data: {
          id: uuidv4(),
          numero: newOrderNumber,
          fechaCreacion: new Date().toISOString(),
          estado: 'Pendiente', // Estado inicial del pedido
          
          // FIX #1: Usar connect para la relación cliente
          cliente: { connect: { id: quote.clienteId } },
          
          notas: quote.notas,
          // FIX #2: Usar los totales almacenados del quote (Subtotal de Venta correcto)
          subtotal: quote.subtotal,
          tax: quote.tax,
          total: quote.total,
          
          // FIX #3: Usar connect para la relación presupuesto (Soluciona el error P1012)
          presupuesto: { connect: { id: quote.id } },
          marginId: quote.marginId, // Copiamos el ID del margen
          
          items: {
            create: quote.items.map(item => ({
              descripcion: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              pesoUnitario: 0, // El presupuesto no tiene peso, se pone 0
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

    return NextResponse.json(newPedido, { status: 201 });

  } catch (error) {
    console.error('Error al convertir presupuesto a pedido:', error);
    return NextResponse.json({ message: error.message || 'Error interno' }, { status: 500 });
  }
}