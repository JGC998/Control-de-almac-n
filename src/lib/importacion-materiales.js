import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const n = (v) => parseFloat(v) || 0;

/**
 * Después de guardar una importación, actualiza TarifaMaterial.precio (€/m²)
 * para cada BOBINA que tenga tarifaMaterialId definido.
 * Fórmula: precio = costeFinalEUR / (totalMetros × ancho_m)
 * Si tarifaMaterialId === '__nuevo__': upsert por (material, espesor).
 * Fire-and-forget — llamar con .catch(() => {}).
 */
export async function actualizarPrecioMateriales(bovinasRaw, totalBobinasEUR, gastosRepercutibles, tasaCambio) {
  const bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  const candidatas = (bobinas ?? []).filter(b =>
    b.tipo === 'BOBINA' && b.tarifaMaterialId && n(b.ancho) > 0 && n(b.longitud) > 0
  );
  if (candidatas.length === 0) return;

  const tc      = n(tasaCambio);
  const gastos  = n(gastosRepercutibles);
  const totalEUR = n(totalBobinasEUR);

  for (const b of candidatas) {
    try {
      const precio     = n(b.precio);
      const numRollos  = Math.max(n(b.numRollos), 1);
      const longitud   = n(b.longitud);
      const anchoM     = n(b.ancho) / 1000;

      if (anchoM <= 0 || longitud <= 0) continue;

      const totalMetros   = longitud * numRollos;
      const usdPorMetro   = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
      const subtotalEUR   = usdPorMetro * totalMetros * tc;
      const proporcion    = totalEUR > 0 ? subtotalEUR / totalEUR : 0;
      const costeFinalEUR = subtotalEUR + gastos * proporcion;

      const totalM2        = totalMetros * anchoM;
      const nuevoPrecioM2  = totalM2 > 0
        ? Math.round((costeFinalEUR / totalM2) * 10000) / 10000
        : 0;

      if (nuevoPrecioM2 <= 0) continue;

      if (b.tarifaMaterialId === '__nuevo__') {
        const refTrimmed = b.referencia?.trim();
        const espesorVal = n(b.espesor);
        if (!refTrimmed || espesorVal <= 0) continue;

        const existente = await db.tarifaMaterial.findFirst({
          where: { material: refTrimmed, espesor: espesorVal },
        });
        if (existente) {
          await db.tarifaMaterial.update({ where: { id: existente.id }, data: { precio: nuevoPrecioM2 } });
        } else {
          await db.tarifaMaterial.create({
            data: { material: refTrimmed, espesor: espesorVal, precio: nuevoPrecioM2, peso: 0 },
          });
        }
      } else {
        await db.tarifaMaterial.update({
          where: { id: b.tarifaMaterialId },
          data: { precio: nuevoPrecioM2 },
        });
      }
    } catch (e) {
      logApiError(e, `actualizarPrecioMateriales:${b.referencia}`);
    }
  }
}
