import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

// GET /api/pedidos-proveedores-data/analisis-precios?material=GOMA
// Devuelve el histórico de coste real €/m por proveedor para un material,
// calculado a partir de ImportacionContenedor (misma fórmula que analisis-rentabilidad).
export async function GET(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`analisis-precios:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const material = searchParams.get('material');

    if (material && material.length > 100) {
      return NextResponse.json({ message: 'Parámetro material inválido' }, { status: 400 });
    }

    // Cargar todas las importaciones con proveedor asignado
    const importaciones = await db.importacionContenedor.findMany({
      where: { proveedorId: { not: null } },
      select: {
        id: true,
        creadaEn: true,
        bobinas: true,
        tasaCambio: true,
        gastosRepercutibles: true,
        totalBobinasEUR: true,
        proveedor: { select: { id: true, nombre: true } },
      },
      orderBy: { creadaEn: 'asc' },
      take: 500,
    });

    // Acumular puntos de precio: { material → { proveedorId → { ...info, puntos[] } } }
    const byMaterialProveedor = {};

    for (const imp of importaciones) {
      if (!imp.proveedor) continue;

      let bobs;
      try {
        bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      } catch { bobs = []; }
      if (!Array.isArray(bobs)) bobs = [];

      const bobinasFiltradas = bobs.filter(b => b.tipo === 'BOBINA' || !b.tipo);
      const tc                = imp.tasaCambio || 1;
      const gastosRepercutibles = imp.gastosRepercutibles || 0;
      const totalBobinasEUR   = imp.totalBobinasEUR || 0;

      for (const b of bobinasFiltradas) {
        const matLabel = b.referencia?.split('-')[0]?.toUpperCase() || null;
        if (!matLabel) continue;

        const longitud = parseFloat(b.longitud) || 0;
        const rollos   = parseFloat(b.numRollos) || 1;
        const precio   = parseFloat(b.precio) || 0;
        const anchoM   = (parseFloat(b.ancho) || 0) / 1000;
        const usdM     = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
        const metros   = longitud * rollos;
        if (metros <= 0 || usdM <= 0) continue;

        const subtotalEUR     = usdM * metros * tc;
        const proporcion      = totalBobinasEUR > 0 ? subtotalEUR / totalBobinasEUR : 0;
        const gastosAsignados = gastosRepercutibles * proporcion;
        const costeRealM      = parseFloat(((subtotalEUR + gastosAsignados) / metros).toFixed(4));

        if (!byMaterialProveedor[matLabel]) byMaterialProveedor[matLabel] = {};
        const pId = imp.proveedor.id;
        if (!byMaterialProveedor[matLabel][pId]) {
          byMaterialProveedor[matLabel][pId] = { proveedorId: pId, nombre: imp.proveedor.nombre, puntos: [] };
        }
        byMaterialProveedor[matLabel][pId].puntos.push({
          fecha:         imp.creadaEn,
          importacionId: imp.id,
          precioMetro:   costeRealM,
          espesor:       parseFloat(b.espesor) || null,
          ancho:         parseFloat(b.ancho) || null,
          referencia:    b.referencia || null,
          tipo:          'IMPORTACION',
          tasaCambio:    tc,
        });
      }
    }

    const materiales = Object.keys(byMaterialProveedor).sort();

    // Sin material → devolver lista de materiales disponibles
    if (!material) {
      return NextResponse.json({ materiales });
    }

    if (!byMaterialProveedor[material]) {
      return NextResponse.json({ material, proveedores: [], truncated: false });
    }

    const result = Object.values(byMaterialProveedor[material])
      .filter(p => p.puntos.length > 0)
      .map(p => ({
        ...p,
        numPedidos:   new Set(p.puntos.map(x => x.importacionId)).size,
        ultimaFecha:  p.puntos[p.puntos.length - 1]?.fecha,
        ultimoPrecio: p.puntos[p.puntos.length - 1]?.precioMetro,
        precioMedio:  parseFloat((p.puntos.reduce((s, x) => s + x.precioMetro, 0) / p.puntos.length).toFixed(4)),
        precioMin:    parseFloat(p.puntos.reduce((m, x) => Math.min(m, x.precioMetro), Infinity).toFixed(4)),
        precioMax:    parseFloat(p.puntos.reduce((m, x) => Math.max(m, x.precioMetro), -Infinity).toFixed(4)),
      }))
      .sort((a, b) => a.ultimoPrecio - b.ultimoPrecio);

    return NextResponse.json({ material, proveedores: result, truncated: false });
  } catch (error) {
    logApiError(error, 'GET /api/pedidos-proveedores-data/analisis-precios');
    return NextResponse.json({ message: 'Error al obtener el análisis' }, { status: 500 });
  }
}
