import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

/**
 * Tras guardar una importación, actualiza precioMetro en Taco
 * para cada ítem TACO que tenga tacoId y totalMetros > 0.
 * Fórmula: nuevoPrecio = costeFinalEUR / totalMetros
 * Fire-and-forget — llamar con .catch(() => {}).
 */
export async function actualizarPrecioTacos(bovinasRaw, totalBobinasEUR, gastosRepercutibles, tasaCambio) {
  const bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  const tacos = (bobinas ?? []).filter(b =>
    b.tipo === 'TACO' && b.tacoId && parseFloat(b.longitud) > 0 && parseFloat(b.precio) > 0
  );
  if (tacos.length === 0) return;

  const tc      = parseFloat(tasaCambio)         || 0;
  const gastos  = parseFloat(gastosRepercutibles) || 0;
  const totalEUR = parseFloat(totalBobinasEUR)   || 0;

  for (const b of tacos) {
    try {
      const precio      = parseFloat(b.precio)   || 0;
      const totalMetros = parseFloat(b.longitud)  || 0;
      if (totalMetros <= 0) continue;

      const subtotalEUR   = precio * totalMetros * tc;
      const proporcion    = totalEUR > 0 ? subtotalEUR / totalEUR : 0;
      const costeFinalEUR = subtotalEUR + gastos * proporcion;
      if (costeFinalEUR <= 0) continue;

      const nuevoPrecio = Math.round((costeFinalEUR / totalMetros) * 100000) / 100000;

      await db.taco.update({
        where: { id: parseInt(b.tacoId, 10) },
        data: { precioMetro: nuevoPrecio },
      });
    } catch (e) {
      logApiError(e, `actualizarPrecioTacos:tacoId=${b.tacoId}`);
    }
  }
}
