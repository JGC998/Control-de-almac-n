import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { handlePrismaError, serializeDecimals } from '@/lib/manejadores-api';
import { presupuestoSchema } from '@/lib/validations';



// GET: Obtener un presupuesto específico por ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const quote = await db.presupuesto.findUnique({
      where: { id: id },
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true, direccion: true, nif: true } },
        items: {
          select: {
            id: true, descripcion: true, quantity: true, unitPrice: true, pesoUnitario: true, detallesTecnicos: true, productoId: true,
            producto: {
              select: {
                id: true, nombre: true, referenciaFabricante: true,
                espesor: true, ancho: true, largo: true, acabado: true,
                subfamilia: { select: { nombre: true, familia: { select: { nombre: true, color: true } } } },
                fabricante: { select: { nombre: true } },
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }
    const serialized = serializeDecimals(quote, ['subtotal', 'tax', 'total']);
    serialized.items = serialized.items.map(item => serializeDecimals(item, ['unitPrice']));
    return NextResponse.json(serialized);
  } catch (error) {
    logApiError(error, 'Error al leer el presupuesto');
    return NextResponse.json({ message: 'Error interno al leer los datos' }, { status: 500 });
  }
}

// PUT: Actualizar un presupuesto existente
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // API-01: Validar con el mismo schema Zod que el POST
    const parsed = presupuestoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const { clienteId, items, estado, marginId, ultimoRecordatorio } = parsed.data;
    // Aceptar 'notas', 'observaciones' o 'notes' para compatibilidad con el cliente
    const finalNotes = body.notas ?? body.notes ?? body.observaciones ?? null;

    // Recalcular totales en servidor con IVA desde Config
    const configIva = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const taxRate = configIva ? parseFloat(configIva.value) / 100 : 0.21;
    const subtotal = parseFloat(items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toFixed(2));
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const updatedQuote = await db.$transaction(async (tx) => {
      // 1. Actualizar datos principales del presupuesto
      const quote = await tx.presupuesto.update({
        where: { id: id },
        data: {
          clienteId,
          estado,
          marginId,
          notas: finalNotes,
          subtotal,
          tax,
          total,
          ...(ultimoRecordatorio !== undefined ? { ultimoRecordatorio: ultimoRecordatorio ? new Date(ultimoRecordatorio) : null } : {}),
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
            productoId: item.productoId || null,
            pesoUnitario: item.pesoUnitario || 0,
            detallesTecnicos: item.detallesTecnicos || null,
            presupuestoId: id,
          })),
        });
      }

      return quote;
    });

    revalidatePath('/presupuestos'); // Invalidate the list page
    revalidatePath(`/presupuestos/${id}`); // Invalidate the detail page
    return NextResponse.json(updatedQuote, { status: 200 });
  } catch (error) {
    logApiError(error, 'Error al actualizar el presupuesto');
    return handlePrismaError(error, { notFound: 'Presupuesto no encontrado' });
  }
}

// DELETE: Eliminar un presupuesto
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await db.presupuesto.delete({ where: { id } });

    revalidatePath('/presupuestos');
    return NextResponse.json({ message: 'Presupuesto eliminado correctamente' }, { status: 200 });
  } catch (error) {
    return handlePrismaError(error, { notFound: 'Presupuesto no encontrado' });
  }
}
