import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';
import { pedidoSchema } from '@/lib/validations';

// GET /api/pedidos - Obtiene todos los pedidos con paginación opcional
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

    const page = parseInt(pageParam || '1');
    const limit = Math.min(parseInt(limitParam || '50'), 500);
    const skip = (page - 1) * limit;

    const [pedidos, total] = await Promise.all([
      db.pedido.findMany({
        where: whereClause,
        take: limit,
        skip,
        include: {
          cliente: { select: { nombre: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.pedido.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: pedidos,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener pedidos' }, { status: 500 });
  }
}

// POST /api/pedidos - Crea un nuevo pedido
export async function POST(request) {
  try {
    const data = await request.json();

    // Validar con Zod
    const validation = pedidoSchema.safeParse(data);

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

    const { clienteId, items, notas, subtotal, tax, total, estado, marginId, sinFacturacion } = validation.data;

    // Generar número de pedido con reset anual
    const newOrderNumber = await getNextNumber('pedido');

    const newOrder = await db.pedido.create({
      data: {
        numero: newOrderNumber,
        estado: estado || 'Pendiente',
        cliente: { connect: { id: clienteId } },
        notas: notas,
        subtotal: subtotal,
        tax: tax,
        total: total,
        marginId: marginId,
        sinFacturacion: sinFacturacion || false,
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
      include: { // Include related data in the response
        cliente: true,
        items: true,
      }
    });

    revalidatePath('/pedidos'); // Invalidate cache

    return NextResponse.json(newOrder, { status: 201 });

  } catch (error) {
    logApiError(error, 'Error al crear el pedido:');
    return NextResponse.json({ message: 'Error interno al guardar el nuevo pedido.' }, { status: 500 });
  }
}
