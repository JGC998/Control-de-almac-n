import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Genera el siguiente número secuencial para un pedido (ej. PED-2025-001)
 */
async function getNextPedidoNumber() {
  const year = new Date().getFullYear();
  const prefix = `PED-${year}-`;

  const lastPedido = await db.pedido.findFirst({
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

// GET /api/pedidos - Obtiene todos los pedidos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const whereClause = {};
    if (clientId) {
      whereClause.clienteId = clientId;
    }

    const pedidos = await db.pedido.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    
    return NextResponse.json(pedidos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener pedidos' }, { status: 500 });
  }
}

// POST /api/pedidos - Crea un nuevo pedido
export async function POST(request) {
  try {
    const data = await request.json();
    const { clienteId, items, notas, subtotal, tax, total, estado, marginId } = data;

    if (!clienteId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Datos incompletos. Se requiere clienteId y al menos un item.' }, { status: 400 });
    }

    // VALIDACIÓN DE TIPOS NUMÉRICOS
    for (const item of items) {
      if (typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
        return NextResponse.json({ message: `El item "${item.description}" tiene valores no numéricos para cantidad o precio.` }, { status: 400 });
      }
    }

    const newOrderNumber = await getNextPedidoNumber();

    const newOrder = await db.pedido.create({
      data: {
        id: uuidv4(),
        numero: newOrderNumber,
        fechaCreacion: new Date().toISOString(),
        estado: estado || 'Pendiente',
        cliente: { connect: { id: clienteId } },
        notas: notas,
        subtotal: subtotal,
        tax: tax,
        total: total,
        marginId: marginId,
        items: {
          create: items.map(item => ({
            descripcion: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pesoUnitario: item.pesoUnitario || 0,
            productoId: item.productId,
          })),
        },
      },
    });

    // --- CORRECCIÓN: Volver a buscar el pedido para incluir las relaciones 'cliente' e 'items' ---
    const populatedOrder = await db.pedido.findUnique({
      where: { id: newOrder.id },
      include: {
        cliente: true,
        items: true,
      },
    });

    return NextResponse.json(populatedOrder, { status: 201 });
    // ------------------------------------------------------------------------------------------

  } catch (error) {
    console.error('Error al crear el pedido:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo pedido.' }, { status: 500 });
  }
}
