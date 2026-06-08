import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/importaciones/[id]/analisis-rentabilidad
// Cruza el coste real de cada bobina con las tarifas de venta actuales.
// Solo lectura — no modifica ningún dato.
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Margen mínimo configurado (por defecto 15%)
    const margenConfig = await db.config.findUnique({ where: { key: 'margen_minimo_alerta' } });
    const margenMinimo = margenConfig?.value ? parseFloat(margenConfig.value) / 100 : 0.15;

    const importacion = await db.importacionContenedor.findUnique({ where: { id } });
    if (!importacion) {
      return NextResponse.json({ message: 'Importación no encontrada' }, { status: 404 });
    }

    const bobs = typeof importacion.bobinas === 'string'
      ? JSON.parse(importacion.bobinas)
      : importacion.bobinas ?? [];

    const tc = importacion.tasaCambio || 1;
    const gastosRepercutibles = (importacion.suplidos || 0) + (importacion.exentos || 0);
    const totalBobinasEUR = (importacion.totalBobinasUSD || 0) * tc;

    const resultados = await Promise.all(
      bobs
        .filter(b => b.tipo === 'BOBINA' || !b.tipo)
        .map(async (b) => {
          const longitud = parseFloat(b.longitud) || 0;
          const rollos   = parseFloat(b.numRollos) || 1;
          const precio   = parseFloat(b.precio) || 0;
          const anchoM   = (parseFloat(b.ancho) || 0) / 1000;
          const usdM     = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
          const metros   = longitud * rollos;
          const subtotalEUR = usdM * metros * tc;

          // Coste real por metro (incluyendo gastos prorrateados por valor)
          const proporcion = totalBobinasEUR > 0 ? subtotalEUR / totalBobinasEUR : 0;
          const gastosAsignados = gastosRepercutibles * proporcion;
          const costeRealM = metros > 0 ? (subtotalEUR + gastosAsignados) / metros : 0;

          // Buscar tarifa de venta actual en tarifas-rollo
          const espesor = parseFloat(b.espesor) || null;
          const ancho   = parseFloat(b.ancho)   || null;
          const material = b.referencia?.split('-')[0]?.toUpperCase() ||
            (importacion.descripcion?.split(' ')[0]?.toUpperCase()) || null;

          let tarifaActual = null;
          if (material && espesor) {
            tarifaActual = await db.tarifaRollo.findFirst({
              where: {
                material: { contains: material },
                espesor,
                ...(ancho ? { ancho } : {}),
              },
              orderBy: { espesor: 'asc' },
            });
          }

          const precioVentaM = tarifaActual ? Number(tarifaActual.precioBase) : null;
          const margenReal   = precioVentaM != null && costeRealM > 0
            ? (precioVentaM - costeRealM) / costeRealM
            : null;
          const precioMinimo = costeRealM > 0 ? costeRealM * (1 + margenMinimo) : null;

          let semaforo = 'gris'; // sin datos de tarifa
          if (margenReal !== null) {
            if (margenReal >= margenMinimo) semaforo = 'verde';
            else if (margenReal >= 0)        semaforo = 'amarillo';
            else                             semaforo = 'rojo';
          }

          return {
            referencia:    b.referencia || `Bobina ${b.espesor}mm`,
            espesor,
            ancho,
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

    return NextResponse.json({
      importacionId: id,
      margenMinimoPct: margenMinimo * 100,
      resultados,
    });
  } catch (error) {
    logApiError(error, 'GET /api/importaciones/[id]/analisis-rentabilidad');
    return NextResponse.json({ message: 'Error al calcular el análisis' }, { status: 500 });
  }
}
