import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { logUpdate } from '@/lib/audit';
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

// PUT /api/tarifas-coste — edición manual de precio/peso por id
export async function PUT(request) {
  try {
    const { id, precio, peso } = await request.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const precioVal = precio != null ? parseFloat(precio) : undefined;
    const pesoVal   = peso   != null ? parseFloat(peso)   : undefined;
    if (precioVal !== undefined && (isNaN(precioVal) || precioVal < 0))
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
    if (pesoVal !== undefined && (isNaN(pesoVal) || pesoVal < 0))
      return NextResponse.json({ error: 'Peso inválido' }, { status: 400 });
    const anterior = await db.tarifaCoste.findUnique({ where: { id } });
    const updated = await db.tarifaCoste.update({
      where: { id },
      data: {
        ...(precioVal !== undefined && { precio: precioVal }),
        ...(pesoVal   !== undefined && { peso:   pesoVal   }),
      },
    });
    logUpdate('TarifaCoste', id, anterior, updated, 'Admin').catch(() => {});
    return NextResponse.json(updated);
  } catch (error) {
    logApiError(error, 'PUT /api/tarifas-coste');
    return NextResponse.json({ error: error?.message ?? 'Error al actualizar' }, { status: 500 });
  }
}

// POST /api/tarifas-coste — backfill inicial desde TarifaMaterial
export async function POST() {
  try {
    const tarifas = await db.tarifaMaterial.findMany();
    let migrados = 0;
    for (const t of tarifas) {
      const colorVal   = t.color   || null;
      const lonasVal   = t.lonas   ?? null;
      const acabadoVal = t.acabado || null;
      const existing = await db.tarifaCoste.findFirst({
        where: { material: t.material, espesor: t.espesor, color: colorVal, lonas: lonasVal, acabado: acabadoVal },
      });
      if (existing) {
        await db.tarifaCoste.update({ where: { id: existing.id }, data: { precio: t.precio, peso: t.peso } });
      } else {
        await db.tarifaCoste.create({
          data: { material: t.material, espesor: t.espesor, precio: t.precio, peso: t.peso, color: colorVal, lonas: lonasVal, acabado: acabadoVal },
        });
      }
      migrados++;
    }
    return NextResponse.json({ ok: true, migrados });
  } catch (error) {
    logApiError(error, 'POST /api/tarifas-coste backfill');
    return NextResponse.json({ error: error?.message ?? 'Error en el backfill' }, { status: 500 });
  }
}
