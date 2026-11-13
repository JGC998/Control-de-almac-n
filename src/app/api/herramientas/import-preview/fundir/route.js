import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function POST(request) {
  try {
    const { productoId, pvpNuevo, udsNuevas, accion } = await request.json();

    if (!productoId) {
      return NextResponse.json({ error: 'productoId requerido' }, { status: 400 });
    }

    if (accion === 'actualizar') {
      const data = {};
      if (pvpNuevo != null && pvpNuevo > 0) data.precioVenta = Number(pvpNuevo);
      if (udsNuevas != null) data.unidadesVendidas = Math.round(Number(udsNuevas));

      const producto = await prisma.producto.update({
        where: { id: productoId },
        data,
        select: { id: true, nombre: true, precioVenta: true, unidadesVendidas: true },
      });

      return NextResponse.json({ ok: true, producto });
    }

    return NextResponse.json({ error: 'accion no reconocida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
