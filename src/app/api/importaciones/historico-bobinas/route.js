import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const importaciones = await db.importacionContenedor.findMany({
      select: {
        id: true, creadaEn: true, descripcion: true,
        tasaCambio: true, totalBobinasEUR: true,
        gastosRepercutibles: true, bobinas: true,
      },
      orderBy: { creadaEn: 'asc' },
      take: 200,
    });

    // Agrupar por referencia de bobina
    const byRef = {};

    for (const imp of importaciones) {
      let bobs;
      try {
        bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      } catch {
        continue;
      }
      if (!Array.isArray(bobs)) continue;

      const totalBobinasEUR = imp.totalBobinasEUR || 0;

      for (const b of bobs) {
        const ref = (b.referencia || '').trim() || 'Sin referencia';
        if (!byRef[ref]) byRef[ref] = [];

        const longitud = parseFloat(b.longitud) || 0;
        const numRollos = parseFloat(b.numRollos) || 1;
        const usdPorMetro = parseFloat(b.usdPorMetro) || 0;
        const totalMetrosBobina = longitud * numRollos;
        const subtotalEUR = usdPorMetro * totalMetrosBobina * imp.tasaCambio;
        const proporcion = totalBobinasEUR > 0 ? subtotalEUR / totalBobinasEUR : 0;
        const gastosProrrateados = (imp.gastosRepercutibles || 0) * proporcion;
        const costePorMetroEUR = totalMetrosBobina > 0
          ? (subtotalEUR + gastosProrrateados) / totalMetrosBobina
          : 0;

        byRef[ref].push({
          fecha: imp.creadaEn,
          importacionId: imp.id,
          importacionDesc: imp.descripcion,
          usdPorMetro,
          tasaCambio: imp.tasaCambio,
          espesor: b.espesor || null,
          ancho: b.ancho || null,
          totalMetros: parseFloat(totalMetrosBobina.toFixed(0)),
          costePorMetroEUR: parseFloat(costePorMetroEUR.toFixed(4)),
        });
      }
    }

    // Convertir a array ordenado por última fecha desc
    const result = Object.entries(byRef)
      .map(([referencia, datos]) => ({
        referencia,
        numImportaciones: datos.length,
        ultimaFecha: datos[datos.length - 1]?.fecha,
        ultimoUsdPorMetro: datos[datos.length - 1]?.usdPorMetro,
        ultimoCostePorMetroEUR: datos[datos.length - 1]?.costePorMetroEUR,
        variacionPct: datos.length >= 2
          ? parseFloat(((datos[datos.length - 1].usdPorMetro - datos[0].usdPorMetro) / datos[0].usdPorMetro * 100).toFixed(1))
          : 0,
        datos,
      }))
      .sort((a, b) => new Date(b.ultimaFecha) - new Date(a.ultimaFecha));

    return NextResponse.json(result);
  } catch (error) {
    logApiError(error, 'GET /api/importaciones/historico-bobinas');
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
