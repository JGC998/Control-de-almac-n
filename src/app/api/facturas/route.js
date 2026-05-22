import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const albaranId = searchParams.get('albaranId');
    const pedidoId = searchParams.get('pedidoId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 500);
    const skip = (page - 1) * limit;
    const estado = searchParams.get('estado');

    const where = {};
    if (clientId)  where.clienteId = clientId;
    if (albaranId) where.albaranId = albaranId;
    if (pedidoId)  where.pedidoId  = pedidoId;
    if (estado)    where.estado    = estado;

    const [facturas, total] = await Promise.all([
      db.factura.findMany({
        where,
        skip,
        take: limit,
        include: {
          cliente: { select: { nombre: true } },
          albaran: { select: { numero: true } },
          pedido:  { select: { numero: true } },
          _count:  { select: { items: true } },
        },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.factura.count({ where }),
    ]);

    return NextResponse.json({
      data: facturas,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al obtener facturas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { clienteId, albaranId, pedidoId, notas, items, fechaVencimiento, estado = 'BORRADOR' } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: 'Se requiere al menos un ítem' }, { status: 400 });
    }

    const numero = await getNextNumber('factura');
    const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const ivaConfig = await db.config.findUnique({ where: { key: 'iva_rate' } });
    const ivaRate = ivaConfig ? parseFloat(ivaConfig.value) : 0.21;
    const tax = subtotal * ivaRate;
    const total = subtotal + tax;

    const factura = await db.factura.create({
      data: {
        numero,
        estado,
        notas,
        subtotal,
        tax,
        total,
        ...(fechaVencimiento && { fechaVencimiento: new Date(fechaVencimiento) }),
        ...(clienteId  && { cliente: { connect: { id: clienteId } } }),
        ...(albaranId  && { albaran: { connect: { id: albaranId } } }),
        ...(pedidoId   && { pedido:  { connect: { id: pedidoId  } } }),
        items: {
          create: items.map(i => ({
            descripcion:      i.descripcion,
            quantity:         i.quantity,
            unitPrice:        i.unitPrice,
            pesoUnitario:     i.pesoUnitario || 0,
            detallesTecnicos: i.detallesTecnicos || null,
            ...(i.productoId && { producto: { connect: { id: i.productoId } } }),
          })),
        },
      },
      include: { items: true, cliente: true, albaran: true, pedido: true },
    });

    revalidatePath('/facturas');
    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al crear factura' }, { status: 500 });
  }
}
