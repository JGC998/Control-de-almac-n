import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/pedidos/taller
// Pedidos activos para el quiosco del taller.
// Devuelve todos los pedidos en estado 'Pendiente' (facturación) cuyo
// tallerEstado sea Pendiente, EnTaller o Listo, ordenados por prioridad.
export async function GET() {
  try {
    const pedidos = await db.pedido.findMany({
      where: {
        estado: 'Pendiente',
        tallerEstado: { in: ['Pendiente', 'EnTaller', 'Listo'] },
      },
      include: {
        cliente: { select: { nombre: true } },
        items: {
          select: {
            descripcion: true,
            quantity: true,
            detallesTecnicos: true,
          },
          orderBy: { descripcion: 'asc' },
        },
      },
      orderBy: { fechaCreacion: 'asc' },
    });

    // Ordenar por prioridad: EnTaller > Pendiente > Listo
    const PRIORIDAD = { EnTaller: 0, Pendiente: 1, Listo: 2 };
    pedidos.sort((a, b) => {
      const pa = PRIORIDAD[a.tallerEstado] ?? 9;
      const pb = PRIORIDAD[b.tallerEstado] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(a.fechaCreacion) - new Date(b.fechaCreacion);
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    logApiError(error, 'GET /api/pedidos/taller');
    return NextResponse.json({ message: 'Error al obtener pedidos del taller' }, { status: 500 });
  }
}
