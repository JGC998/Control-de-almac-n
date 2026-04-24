import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';
import { presupuestoSchema } from '@/lib/validations';

// GET /api/presupuestos - Obtiene todos los presupuestos con paginación opcional
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const whereClause = {};
    if (clientId) {
      whereClause.clienteId = clientId;
    }

    // Comportamiento paginado si se solicitan parámetros
    if (pageParam || limitParam) {
      const page = parseInt(pageParam || '1');
      const limit = parseInt(limitParam || '50');
      const skip = (page - 1) * limit;

      const [quotes, total] = await Promise.all([
        db.presupuesto.findMany({
          where: whereClause,
          take: limit,
          skip: skip,
          include: {
            cliente: { select: { nombre: true } },
          },
          orderBy: { fechaCreacion: 'desc' },
        }),
        db.presupuesto.count({ where: whereClause })
      ]);

      return NextResponse.json({
        data: quotes,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }

    // Comportamiento legado: cap de seguridad para evitar full-table scans
    const quotes = await db.presupuesto.findMany({
      where: whereClause,
      take: 500,
      include: {
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener presupuestos' }, { status: 500 });
  }
}

// POST /api/presupuestos - Crea un nuevo presupuesto
export async function POST(request) {
  try {
    const data = await request.json();

    // Validar con Zod
    const validation = presupuestoSchema.safeParse(data);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validación fallida',
          details: validation.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    // FIX: Aceptamos 'notas', 'observaciones' o 'notes' para máxima compatibilidad.
    const { clienteId, items, estado, marginId, subtotal, tax, total, notas } = validation.data;

    // Generar número de presupuesto con reset anual
    const newQuoteNumber = await getNextNumber('presupuesto');

    const newQuote = await db.presupuesto.create({
      data: {
        numero: newQuoteNumber,
        estado: estado || 'Borrador',

        cliente: { connect: { id: clienteId } },
        marginId: marginId,

        notas: notas,
        subtotal: subtotal,
        tax: tax,
        total: total,

        items: {
          create: items.map(item => ({
            descripcion: item.descripcion,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productoId || null,
            pesoUnitario: item.pesoUnitario || 0,
          })),
        },
      },
    });

    revalidatePath('/presupuestos'); // Invalidate cache for the list page
    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error al crear el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}