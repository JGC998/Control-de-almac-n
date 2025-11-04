import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Obtener un presupuesto específico por ID
export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const quote = await db.presupuesto.findUnique({
      where: { id: id },
      include: {
        cliente: true, // Incluye todos los datos del cliente
        items: true,   // Incluye los items del presupuesto
      },
    });

    if (!quote) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error al leer el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al leer los datos' }, { status: 500 });
  }
}

// PUT: Actualizar un presupuesto existente
export async function PUT(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO
    const data = await request.json();
    const { items, ...updatedQuoteData } = data; // Separamos los items del resto

    const transaction = await db.$transaction(async (tx) => {
      // 1. Actualizar datos principales del presupuesto
      const updatedQuote = await tx.presupuesto.update({
        where: { id: id },
        data: {
          ...updatedQuoteData,
          // fechaModificacion: new Date().toISOString(), // (Opcional: añadir este campo al schema)
        },
      });

      // 2. Eliminar todos los items antiguos
      await tx.presupuestoItem.deleteMany({
        where: { presupuestoId: id },
      });

      // 3. Crear todos los items nuevos
      if (items && items.length > 0) {
        await tx.presupuestoItem.createMany({
          data: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productId,
            presupuestoId: id, // Enlazamos al presupuesto
          })),
        });
      }

      return updatedQuote;
    });

    // Devolvemos el presupuesto actualizado (sin los items, para simplificar)
    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el presupuesto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al actualizar los datos' }, { status: 500 });
  }
}

// DELETE: Eliminar un presupuesto
export async function DELETE(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO

    await db.$transaction(async (tx) => {
      // 1. Eliminar todos los items asociados
      await tx.presupuestoItem.deleteMany({
        where: { presupuestoId: id },
      });
      
      // 2. Eliminar el presupuesto principal
      await tx.presupuesto.delete({
        where: { id: id },
      });
    });

    return NextResponse.json({ message: 'Presupuesto eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el presupuesto:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al eliminar los datos' }, { status: 500 });
  }
}
