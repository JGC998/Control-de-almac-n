import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/importaciones/[id]/analisis-rentabilidad
// Cruza el coste real de cada bobina con las tarifas de venta actuales.
// Solo lectura — no modifica ningún dato.
export async function GET(request, { params }) {
  // SEC-01: rate limiting — endpoint potencialmente pesado
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const rl = checkRateLimit(`analisis-rent:${ip}`, 20);
  if (!rl.allowed) {
    return NextResponse.json(
      { message: 'Demasiadas peticiones. Inténtalo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  try {
    const { id } = await params;

    // SEC-02: validar formato UUID
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const [margenConfig, importacion] = await Promise.all([
      db.config.findUnique({ where: { key: 'margen_minimo_alerta' } }),
      db.importacionContenedor.findUnique({ where: { id } }),
    ]);

    const margenMinimo = margenConfig?.value ? parseFloat(margenConfig.value) / 100 : 0.15;

    if (!importacion) {
      return NextResponse.json({ message: 'Importación no encontrada' }, { status: 404 });
    }

    // BUG-14: JSON.parse('null') devuelve null, no [] — proteger con Array.isArray
    let bobs;
    try {
      bobs = typeof importacion.bobinas === 'string'
        ? JSON.parse(importacion.bobinas)
        : importacion.bobinas;
    } catch { bobs = []; }
    if (!Array.isArray(bobs)) bobs = [];

    const tc = importacion.tasaCambio || 1;
    const gastosRepercutibles = (importacion.suplidos || 0) + (importacion.exentos || 0);
    const totalBobinasEUR = (importacion.totalBobinasUSD || 0) * tc;

    const bobsFiltradas = bobs.filter(b => b.tipo === 'BOBINA' || !b.tipo);

    // BACK-01: pre-cargar todas las tarifas en una sola query en lugar de N queries
    const uniqueEspesores = [...new Set(
      bobsFiltradas.map(b => parseFloat(b.espesor) || null).filter(Boolean)
    )];

    const todasTarifas = uniqueEspesores.length > 0
      ? await db.tarifaRollo.findMany({ where: { espesor: { in: uniqueEspesores } } })
      : [];

    // BUG-04: Promise.allSettled para que un error en una bobina no cancele todas
    const settled = await Promise.allSettled(
      bobsFiltradas.map(async (b) => {
        const longitud = parseFloat(b.longitud) || 0;
        const rollos   = parseFloat(b.numRollos) || 1;
        const precio   = parseFloat(b.precio) || 0;
        const anchoM   = (parseFloat(b.ancho) || 0) / 1000;
        const usdM     = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
        const metros   = longitud * rollos;
        const subtotalEUR = usdM * metros * tc;

        const proporcion = totalBobinasEUR > 0 ? subtotalEUR / totalBobinasEUR : 0;
        const gastosAsignados = gastosRepercutibles * proporcion;
        const costeRealM = metros > 0 ? (subtotalEUR + gastosAsignados) / metros : 0;

        const espesor  = parseFloat(b.espesor) || null;
        const ancho    = parseFloat(b.ancho)   || null;
        const material = b.referencia?.split('-')[0]?.toUpperCase() ||
          (importacion.descripcion?.split(' ')[0]?.toUpperCase()) || null;

        // Buscar en memoria (ya pre-cargadas arriba)
        const tarifaActual = (material && espesor)
          ? (todasTarifas.find(t =>
              t.espesor === espesor &&
              t.material.toUpperCase().includes(material) &&
              (!ancho || t.ancho === ancho)
            ) ?? null)
          : null;

        const precioVentaM = tarifaActual ? Number(tarifaActual.precioBase) : null;
        const margenReal   = precioVentaM != null && costeRealM > 0
          ? (precioVentaM - costeRealM) / costeRealM
          : null;
        const precioMinimo = costeRealM > 0 ? costeRealM * (1 + margenMinimo) : null;

        let semaforo = 'gris';
        if (margenReal !== null) {
          if (margenReal >= margenMinimo) semaforo = 'verde';
          else if (margenReal >= 0)        semaforo = 'amarillo';
          else                             semaforo = 'rojo';
        }

        return {
          referencia:    b.referencia || `Bobina ${b.espesor}mm`,
          espesor, ancho,
          metros:        parseFloat(metros.toFixed(1)),
          costeRealM:    parseFloat(costeRealM.toFixed(4)),
          precioVentaM:  precioVentaM != null ? parseFloat(precioVentaM.toFixed(4)) : null,
          margenRealPct: margenReal != null ? parseFloat((margenReal * 100).toFixed(1)) : null,
          precioMinimo:  precioMinimo != null ? parseFloat(precioMinimo.toFixed(4)) : null,
          semaforo,
          tarifaId:      tarifaActual?.id ?? null,
        };
      })
    );

    const resultados = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { referencia: `Bobina ${i + 1}`, semaforo: 'gris', error: true, metros: 0, costeRealM: 0, precioVentaM: null, margenRealPct: null, precioMinimo: null }
    );

    return NextResponse.json({ importacionId: id, margenMinimoPct: margenMinimo * 100, resultados });
  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]/analisis-rentabilidad');
    return NextResponse.json({ message: 'Error al calcular el análisis' }, { status: 500 });
  }
}
