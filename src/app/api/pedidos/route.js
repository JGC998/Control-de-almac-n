import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';
import { pedidoSchema } from '@/lib/validations';
import { serializeDecimals } from '@/lib/manejadores-api';

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

    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10) || 50));
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

    const { clienteId, items, notas, estado, marginId, sinFacturacion } = validation.data;

    // BACK-01: Recalcular totales en servidor para no confiar en valores del cliente
    const configIva = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const taxRate = configIva ? parseFloat(configIva.value) / 100 : 0.21;
    const subtotal = parseFloat(items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toFixed(2));
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    // Generar número de pedido con reset anual
    const newOrderNumber = await getNextNumber('pedido');

    const newOrder = await db.pedido.create({
      data: {
        numero: newOrderNumber,
        estado: estado || 'Pendiente',
        ...(clienteId ? { cliente: { connect: { id: clienteId } } } : {}),
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
    const serialized = serializeDecimals(newOrder, ['subtotal', 'tax', 'total']);
    serialized.items = (serialized.items || []).map(item => serializeDecimals(item, ['unitPrice']));
    return NextResponse.json(serialized, { status: 201 });

  } catch (error) {
    logApiError(error, 'Error al crear el pedido:');
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno al guardar el nuevo pedido.' }, { status: 500 });
  }
}
