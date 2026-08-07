import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getNextNumber } from '@/lib/sequence';
import { albaranSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET /api/albaranes — lista paginada
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId  = searchParams.get('clientId');
    const busqueda  = searchParams.get('busqueda');
    const page      = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit     = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip      = (page - 1) * limit;

    const where = {};
    if (clientId) where.clienteId = clientId;
    if (busqueda) {
      where.OR = [
        { numero: { contains: busqueda } },
        { cliente: { nombre: { contains: busqueda } } },
      ];
    }

    const [albaranes, total] = await Promise.all([
      db.albaran.findMany({
        where,
        take: limit,
        skip,
        include: { cliente: { select: { nombre: true } } },
        orderBy: { fechaCreacion: 'desc' },
      }),
      db.albaran.count({ where }),
    ]);

    return NextResponse.json({
      data: albaranes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logApiError(error, 'Error al listar albaranes');
    return NextResponse.json({ message: 'Error al obtener albaranes' }, { status: 500 });
  }
}

// POST /api/albaranes — crear albarán sin valorar
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = albaranSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validación fallida', details: parsed.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }

    const { clienteId, items, notas, valorado = false, pedidoId } = parsed.data;
    const numero = await getNextNumber('albaran');

    const nuevo = await db.albaran.create({
      data: {
        numero,
        estado: 'Pendiente',
        valorado,
        notas: notas ?? null,
        subtotal: 0,
        tax: 0,
        total: 0,
        clienteId: clienteId || null,
        pedidoId: pedidoId || null,
        items: {
          create: items.map(item => ({
            descripcion: item.descripcion,
            quantity: item.quantity,
            unitPrice: 0,
            pesoUnitario: 0,
            productoId: item.productoId || null,
          })),
        },
      },
      include: {
        cliente: { select: { id: true, nombre: true, direccion: true, nif: true, telefono: true } },
        items: true,
      },
    });

    revalidatePath('/albaranes');
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
    logApiError(error, 'Error al crear albarán');
    return NextResponse.json({ message: 'Error al crear albarán' }, { status: 500 });
  }
}
