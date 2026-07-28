import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
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

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10) || 50));
    const skip = (page - 1) * limit;

    const [quotes, total] = await Promise.all([
      db.presupuesto.findMany({
        where: whereClause,
        take: limit,
        skip,
        include: {
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.presupuesto.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: quotes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError(error);
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
    const { clienteId, items, estado, marginId, notas } = validation.data;

    // BACK-01: Recalcular totales en servidor para no confiar en valores del cliente
    const configIva = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const taxRate = configIva ? parseFloat(configIva.value) / 100 : 0.21;
    const subtotal = parseFloat(items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toFixed(2));
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Generar número de presupuesto con reset anual
    const newQuoteNumber = await getNextNumber('presupuesto');

    const newQuote = await db.presupuesto.create({
      data: {
        numero: newQuoteNumber,
        estado: estado || 'Borrador',

        ...(clienteId ? { cliente: { connect: { id: clienteId } } } : {}),
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
            pesoUnitario: item.pesoUnitario || 0,
            detallesTecnicos: item.detallesTecnicos || null,
            ...(item.productoId ? { producto: { connect: { id: item.productoId } } } : {}),
          })),
        },
      },
    });

    revalidatePath('/presupuestos'); // Invalidate cache for the list page
    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    logApiError(error, 'Error al crear el presupuesto:');
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}