import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/tarifas-coste
export async function GET() {
  try {
    const tarifas = await db.tarifaCoste.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    logApiError(error, 'GET /api/tarifas-coste');
    return NextResponse.json({ error: 'Error al obtener tarifas de coste' }, { status: 500 });
  }
}

// POST /api/tarifas-coste — backfill inicial desde TarifaMaterial
export async function POST() {
  try {
    const tarifas = await db.tarifaMaterial.findMany();
    let migrados = 0;
    for (const t of tarifas) {
      await db.tarifaCoste.upsert({
        where: {
          material_espesor_color_lonas_acabado: {
            material: t.material,
            espesor:  t.espesor,
            color:    t.color    ?? null,
            lonas:    t.lonas    ?? null,
            acabado:  t.acabado  ?? null,
          },
        },
        update: { precio: t.precio, peso: t.peso },
        create: {
          material: t.material,
          espesor:  t.espesor,
          precio:   t.precio,
          peso:     t.peso,
          color:    t.color    ?? null,
          lonas:    t.lonas    ?? null,
          acabado:  t.acabado  ?? null,
        },
      });
      migrados++;
    }
    return NextResponse.json({ ok: true, migrados });
  } catch (error) {
    logApiError(error, 'POST /api/tarifas-coste backfill');
    return NextResponse.json({ error: 'Error en el backfill' }, { status: 500 });
  }
}
