import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  estado: z.enum(['Facturado', 'Cancelado', 'Pendiente']),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { ids, estado } = parsed.data;

    const result = await db.pedido.updateMany({
      where: { id: { in: ids } },
      data: { estado },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    logApiError(error, 'POST /api/pedidos/bulk-update');
    return NextResponse.json({ error: 'Error al actualizar pedidos' }, { status: 500 });
  }
}
