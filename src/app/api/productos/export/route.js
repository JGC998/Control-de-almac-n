import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

// GET /api/productos/export?format=csv&activo=true|false|(omitir=todos)
export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`productos-export:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  try {
    const { searchParams } = new URL(request.url);
    const activoParam = searchParams.get('activo');

    const where = {};
    if (activoParam === 'true')  where.activo = true;
    if (activoParam === 'false') where.activo = false;

    const productos = await db.producto.findMany({
      where,
      take: 10000,
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
      include: {
        material: true,
        subfamilia: { include: { familia: true } },
      },
    });

    const escape = v => {
      const s = v == null ? '' : String(v);
      return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const COLS = [
      { header: 'id',                   get: p => p.id },
      { header: 'nombre',               get: p => p.nombre },
      { header: 'tipo',                 get: p => p.tipo },
      { header: 'unidad',               get: p => p.unidad },
      { header: 'activo',               get: p => p.activo ? 'SI' : 'NO' },
      { header: 'material',             get: p => p.material?.nombre ?? '' },
      { header: 'espesor_mm',           get: p => p.espesor ?? '' },
      { header: 'acabado',              get: p => p.acabado ?? '' },
      { header: 'color',                get: p => p.color ?? '' },
      { header: 'ancho_mm',             get: p => p.ancho ?? '' },
      { header: 'largo_mm',             get: p => p.largo ?? '' },
      { header: 'precio_unitario_eur',  get: p => p.precioUnitario ? Number(p.precioUnitario) : '' },
      { header: 'peso_unitario_kg',     get: p => p.pesoUnitario ? Number(p.pesoUnitario) : '' },
      { header: 'referencia_fabricante',get: p => p.referenciaFabricante ?? '' },
      { header: 'descripcion',          get: p => p.descripcion ?? '' },
      { header: 'familia',              get: p => p.subfamilia?.familia?.nombre ?? '' },
      { header: 'subfamilia',           get: p => p.subfamilia?.nombre ?? '' },
    ];

    const header = COLS.map(c => c.header).join(';');
    const rows = productos.map(p =>
      COLS.map(c => escape(c.get(p))).join(';')
    );
    const csv = [header, ...rows].join('\r\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="productos_${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    logApiError(error, 'GET /api/productos/export');
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}
