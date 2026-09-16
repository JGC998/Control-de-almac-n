import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const n = (v) => parseFloat(v) || 0;

/**
 * Después de guardar una importación, actualiza TarifaCoste.precio (€/m²)
 * para cada BOBINA que tenga tarifaMaterialId definido.
 * Fórmula: precio = costeFinalEUR / (totalMetros × ancho_m)
 *
 * NO modifica TarifaMaterial (precios de venta) — esa tabla solo se edita
 * manualmente desde /tarifas.
 *
 * Fire-and-forget — llamar con .catch(() => {}).
 */
export async function actualizarPrecioMateriales(bovinasRaw, totalBobinasEUR, gastosRepercutibles, tasaCambio, importacionId = null) {
  const bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  const candidatas = (bobinas ?? []).filter(b =>
    b.tipo === 'BOBINA' && b.tarifaMaterialId && n(b.ancho) > 0 && n(b.longitud) > 0
  );
  if (candidatas.length === 0) return;

  const tc       = n(tasaCambio);
  const gastos   = n(gastosRepercutibles);
  const totalEUR = n(totalBobinasEUR);

  const resultados = await Promise.allSettled(candidatas.map(async (b) => {
    const precio    = n(b.precio);
    const numRollos = Math.max(n(b.numRollos), 1);
    const longitud  = n(b.longitud);
    const anchoM    = n(b.ancho) / 1000;

    if (anchoM <= 0 || longitud <= 0) return;

    const totalMetros   = longitud * numRollos;
    const usdPorMetro   = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
    const subtotalEUR   = usdPorMetro * totalMetros * tc;
    const proporcion    = totalEUR > 0 ? subtotalEUR / totalEUR : 0;
    const costeFinalEUR = subtotalEUR + gastos * proporcion;

    const totalM2       = totalMetros * anchoM;
    const nuevoPrecioM2 = totalM2 > 0
      ? Math.round((costeFinalEUR / totalM2) * 10000) / 10000
      : 0;

    if (nuevoPrecioM2 <= 0) return;

    // Obtener los datos del material — solo lectura, sin modificar TarifaMaterial
    let materialNombre, espesorVal, colorVal, lonasVal, acabadoVal;

    if (b.tarifaMaterialId === '__nuevo__') {
      materialNombre = b.material?.trim() || b.referencia?.trim();
      espesorVal     = n(b.espesor);
      if (!materialNombre || espesorVal <= 0) return;
      colorVal   = null;
      lonasVal   = null;
      acabadoVal = null;
    } else {
      const tarifa = await db.tarifaMaterial.findUnique({ where: { id: b.tarifaMaterialId } });
      if (!tarifa) return;
      materialNombre = tarifa.material;
      espesorVal     = tarifa.espesor;
      colorVal       = tarifa.color   || null;
      lonasVal       = tarifa.lonas   ?? null;
      acabadoVal     = tarifa.acabado || null;
    }

    // Actualizar TarifaCoste con el coste real de esta importación (último conocido)
    const tcExisting = await db.tarifaCoste.findFirst({
      where: { material: materialNombre, espesor: espesorVal, color: colorVal, lonas: lonasVal, acabado: acabadoVal },
    });
    if (tcExisting) {
      await db.tarifaCoste.update({
        where: { id: tcExisting.id },
        data: { precio: nuevoPrecioM2, importacionId: importacionId ?? undefined },
      });
    } else {
      await db.tarifaCoste.create({
        data: { material: materialNombre, espesor: espesorVal, color: colorVal, lonas: lonasVal, acabado: acabadoVal, precio: nuevoPrecioM2, peso: 0, importacionId: importacionId ?? null },
      });
    }

    // Registrar en historial (nunca sobreescribe — un registro por importación)
    await db.tarifaCostoHistorial.create({
      data: { material: materialNombre, espesor: espesorVal, color: colorVal, lonas: lonasVal, acabado: acabadoVal, precio: nuevoPrecioM2, importacionId: importacionId ?? null },
    });
  }));

  const fallidos = resultados.filter(r => r.status === 'rejected');
  if (fallidos.length > 0) {
    logApiError(
      new Error(`${fallidos.length}/${candidatas.length} tarifas de coste no actualizadas`),
      'actualizarPrecioMateriales'
    );
  }
}
