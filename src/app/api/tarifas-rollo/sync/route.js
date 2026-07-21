import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

// POST /api/tarifas-rollo/sync
// Recalcula precioBase de todos los rollos en base al precio €/m² de TarifaMaterial.
// Solo actualiza precioBase — los precios de venta manuales (preciosVenta en TarifaMaterial)
// no se tocan nunca, independientemente de si el precio subió o bajó.
export async function POST() {
  try {
    const [rollos, materiales] = await Promise.all([
      db.tarifaRollo.findMany({ take: 2000 }),
      db.tarifaMaterial.findMany({ select: { material: true, espesor: true, precio: true, acabado: true } }),
    ]);

    let actualizados = 0;
    const updates = [];

    for (const r of rollos) {
      if (!r.ancho) continue;
      const matches = materiales.filter(m => m.material === r.material && m.espesor === r.espesor);
      const match = matches.find(m => m.acabado == null) ?? matches[0] ?? null;
      if (!match) continue;

      const esperado = match.precio * (r.ancho / 1000) * r.metrajeMinimo;
      if (Math.abs(esperado - r.precioBase) < 0.001) continue;

      updates.push(db.tarifaRollo.update({
        where: { id: r.id },
        data: { precioBase: esperado },
      }));
      actualizados++;
    }

    await Promise.all(updates);
    return NextResponse.json({ actualizados, total: rollos.length });
  } catch (error) {
    logApiError(error, 'POST /api/tarifas-rollo/sync');
    return NextResponse.json({ message: 'Error al sincronizar precios' }, { status: 500 });
  }
}
