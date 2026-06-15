import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

/**
 * Después de guardar una importación, actualiza precioPor100mm en ModeloGrapa
 * para cada ítem GRAPA que tenga referencia, ancho y paresPorCaja definidos.
 * Fórmula: nuevoPrecio = (costeEUR/caja) / (paresPorCaja × ancho_mm / 100)
 * También registra el cambio en HistorialPrecioGrapa.
 * Fire-and-forget — llamar con .catch(() => {}).
 */
export async function actualizarPrecioGrapas(bovinasRaw, totalBobinasEUR, gastosRepercutibles, tasaCambio, importacionId) {
  const bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  const grapas = (bobinas ?? []).filter(b =>
    b.tipo === 'GRAPA' && b.referencia && parseFloat(b.paresPorCaja) > 0 && parseFloat(b.ancho) > 0
  );
  if (grapas.length === 0) return;

  const tc      = parseFloat(tasaCambio)          || 0;
  const gastos  = parseFloat(gastosRepercutibles)  || 0;
  const totalEUR = parseFloat(totalBobinasEUR)    || 0;

  for (const b of grapas) {
    try {
      const precio     = parseFloat(b.precio)        || 0;
      const numCajas   = Math.max(parseFloat(b.numRollos)    || 1, 1);
      const paresPorCaja = Math.round(parseFloat(b.paresPorCaja));
      const anchoPar     = Math.round(parseFloat(b.ancho));

      if (paresPorCaja <= 0 || anchoPar <= 0) continue;

      const subtotalEUR   = precio * numCajas * tc;
      const proporcion    = totalEUR > 0 ? subtotalEUR / totalEUR : 0;
      const costeFinalEUR = subtotalEUR + gastos * proporcion;
      const costePorCaja  = costeFinalEUR / numCajas;
      if (costePorCaja <= 0) continue;

      // precioPor100mm = coste_por_caja / (paresPorCaja × ancho_mm / 100)
      const unidades100mm  = paresPorCaja * anchoPar / 100;
      const nuevoPrecio    = Math.round((costePorCaja / unidades100mm) * 100000) / 100000;

      const modelo = await db.modeloGrapa.findFirst({
        where: { nombre: { equals: b.referencia.trim(), mode: 'insensitive' }, activo: true },
        select: { id: true, precioPor100mm: true },
      });
      if (!modelo) continue;

      const precioAnterior = modelo.precioPor100mm;

      await db.modeloGrapa.update({
        where: { id: modelo.id },
        data: { precioPor100mm: nuevoPrecio },
      });

      await db.historialPrecioGrapa.create({
        data: {
          modeloGrapaId:          modelo.id,
          precioPor100mmAnterior: precioAnterior,
          precioPor100mmNuevo:    nuevoPrecio,
          costePorCaja,
          anchoPar,
          paresPorCaja,
          importacionId:          importacionId ?? null,
        },
      });
    } catch (e) {
      logApiError(e, `actualizarPrecioGrapas:${b.referencia}`);
    }
  }
}
