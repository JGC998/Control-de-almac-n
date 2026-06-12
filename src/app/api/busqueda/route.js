import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Rate limit: 30 búsquedas/min por IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`busqueda:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Permitir consulta si está vacía o es muy corta para la búsqueda en tiempo real
    if (!query || query.length < 2 || query.length > 100) {
      return NextResponse.json([]);
    }

    const searchConfig = {
      where: { nombre: { contains: query } },
      take: 5,
    };

    const productSearchConfig = {
      where: {
        OR: [
          { nombre: { contains: query } },
          { referenciaFabricante: { contains: query } },
        ],
      },
      take: 5,
    };

    const numSearchConfig = (field) => ({
      where: { [field]: { contains: query } },
      take: 5,
    });

    // Buscar en paralelo
    const [clientes, productos, pedidos, presupuestos] = await Promise.all([
      db.cliente.findMany({ ...searchConfig, select: { id: true, nombre: true, email: true } }),
      db.producto.findMany({ ...productSearchConfig, select: { id: true, nombre: true, referenciaFabricante: true } }),
      db.pedido.findMany({
        ...numSearchConfig('numero'),
        select: { id: true, numero: true, estado: true, total: true, cliente: { select: { nombre: true } } },
      }),
      db.presupuesto.findMany({
        ...numSearchConfig('numero'),
        select: { id: true, numero: true, estado: true, total: true, cliente: { select: { nombre: true } } },
      }),
    ]);

    const results = [
      ...clientes.map(c => ({ id: c.id, nombre: c.nombre, email: c.email, type: 'cliente' })),
      ...productos.map(p => ({ id: p.id, nombre: p.nombre, referencia: p.referenciaFabricante, type: 'producto' })),
      ...pedidos.map(p => ({ id: p.id, numero: p.numero, estado: p.estado, total: p.total, clienteNombre: p.cliente?.nombre, type: 'pedido' })),
      ...presupuestos.map(q => ({ id: q.id, numero: q.numero, estado: q.estado, total: q.total, clienteNombre: q.cliente?.nombre, type: 'presupuesto' })),
    ];

    // Ordenar los resultados para priorizar los que coinciden al principio, si fuera necesario.
    // Aquí simplemente los devolvemos todos juntos.

    return NextResponse.json(results);
  } catch (error) {
    logApiError(error);
    return NextResponse.json({ message: 'Error al realizar la búsqueda' }, { status: 500 });
  }
}
