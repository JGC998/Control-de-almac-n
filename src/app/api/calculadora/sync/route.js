import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [tarifas, margenes, configList, modelosGrapa] = await Promise.all([
      db.tarifaMaterial.findMany({
        orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
        select: { id: true, material: true, espesor: true, precio: true, peso: true, lonas: true, acabado: true, color: true },
      }),
      db.reglaMargen.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, descripcion: true, multiplicador: true, gastoFijo: true },
      }),
      db.config.findMany({ where: { key: { in: ['costeVulcanizadoMetro'] } } }),
      db.modeloGrapa.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, nombre: true, tipo: true, espesorDesde: true, espesorHasta: true, precioPor100mm: true, anchosDisponibles: true },
      }),
    ]);

    const config = {};
    for (const c of configList) {
      const n = parseFloat(c.value);
      config[c.key] = isNaN(n) ? c.value : n;
    }

    return NextResponse.json({ tarifas, margenes, config, modelosGrapa, syncedAt: new Date().toISOString() });
  } catch (error) {
    logApiError(error, 'GET /api/calculadora/sync');
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 });
  }
}
