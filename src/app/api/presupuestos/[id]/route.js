import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTotalsBackend } from '@/lib/pricing-utils';

export const dynamic = 'force-dynamic';

// GET: Obtener un presupuesto específico por ID
export async function GET(request, { params }) {
  try {
    const { id } = await params; 
    const quote = await db.presupuesto.findUnique({
      where: { id: id },
      include: {
        cliente: true, 
        items: true,   
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
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    // FIX: Aceptamos 'notas', 'observaciones' o 'notes' para máxima compatibilidad.
    const { clienteId, items, estado, marginId, subtotal, tax, total, notes, notas, observaciones } = data;
    const finalNotes = notes || notas || observaciones || null; // Coalesce para obtener el valor correcto

    if (!clienteId || !items) {
      return NextResponse.json({ message: 'Datos incompletos.' }, { status: 400 });
    }

    const updatedQuote = await db.$transaction(async (tx) => {
      // 1. Actualizar datos principales del presupuesto
      const quote = await tx.presupuesto.update({
        where: { id: id },
        data: {
          clienteId: clienteId,
          estado: estado,
          marginId: marginId,
          notas: finalNotes, // Usamos el valor coalesced
          subtotal: subtotal,
          tax: tax,
          total: total,
        },
      });

      // 2. Borrar items antiguos
      await tx.presupuestoItem.deleteMany({
        where: { presupuestoId: id },
      });

      // 3. Crear items nuevos
      if (items && items.length > 0) {
        await tx.presupuestoItem.createMany({
          data: items.map(item => ({
            descripcion: item.descripcion,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productoId,
            pesoUnitario: item.pesoUnitario || 0, // Verificado: Se guarda correctamente
            presupuestoId: id,
          })),
        });
      }
      
      return quote;
    });

    return NextResponse.json(updatedQuote, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al actualizar el presupuesto.' }, { status: 500 });
  }
}

// DELETE: Eliminar un presupuesto
export async function DELETE(request, { params }) {
  try {
    const { id } = await params; 

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
