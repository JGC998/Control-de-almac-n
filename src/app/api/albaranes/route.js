import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const pedidoId = searchParams.get('pedidoId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 500);
    const skip = (page - 1) * limit;
    const estado = searchParams.get('estado');

    const where = {};
    if (clientId) where.clienteId = clientId;
    if (pedidoId) where.pedidoId = pedidoId;
    if (estado) where.estado = estado;

    const [albaranes, total] = await Promise.all([
      db.albaran.findMany({
        where,
        skip,
        take: limit,
        include: {
          cliente: { select: { nombre: true } },
          pedido:  { select: { numero: true } },
          factura: { select: { id: true } },
          _count:  { select: { items: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.albaran.count({ where }),
    ]);

    return NextResponse.json({
      data: albaranes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener albaranes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { clienteId, pedidoId, notas, items, estado = 'BORRADOR' } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere al menos un ítem' }, { status: 400 });
    }

    const itemInvalido = items.find(i =>
      !i.descripcion ||
      typeof i.descripcion !== 'string' ||
      isNaN(Number(i.quantity)) || Number(i.quantity) <= 0 ||
      isNaN(Number(i.unitPrice)) || Number(i.unitPrice) < 0
    );
    if (itemInvalido) {
      return NextResponse.json(
        { message: 'Cada ítem debe tener descripción, cantidad positiva y precio no negativo.' },
        { status: 400 }
      );
    }

    const numero = await getNextNumber('albaran');

    const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const ivaConfig = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const ivaRate = ivaConfig ? parseFloat(ivaConfig.value) : 0.21;
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;

    const albaran = await db.albaran.create({
      data: {
        numero,
        estado,
        notas,
        subtotal,
        tax,
        total,
        ...(clienteId && { cliente: { connect: { id: clienteId } } }),
        ...(pedidoId && { pedido: { connect: { id: pedidoId } } }),
        items: {
          create: items.map(i => ({
            descripcion: i.descripcion,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            pesoUnitario: i.pesoUnitario || 0,
            detallesTecnicos: i.detallesTecnicos || null,
            ...(i.productoId && { producto: { connect: { id: i.productoId } } }),
          })),
        },
      },
      include: { items: true, cliente: true, pedido: true },
    });

    revalidatePath('/albaranes');
    return NextResponse.json(albaran, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al crear albarán' }, { status: 500 });
  }
}
