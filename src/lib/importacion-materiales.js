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
export async function actualizarPrecioMateriales(bovinasRaw, totalBobinasEUR, gastosRepercutibles, tasaCambio, importacionId = null) {
  const bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  const candidatas = (bobinas ?? []).filter(b =>
    b.tipo === 'BOBINA' && b.tarifaMaterialId && n(b.ancho) > 0 && n(b.longitud) > 0
  );
  if (candidatas.length === 0) return;

  const tc      = n(tasaCambio);
  const gastos  = n(gastosRepercutibles);
  const totalEUR = n(totalBobinasEUR);

  const resultados = await Promise.allSettled(candidatas.map(async (b) => {
    const precio     = n(b.precio);
    const numRollos  = Math.max(n(b.numRollos), 1);
    const longitud   = n(b.longitud);
    const anchoM     = n(b.ancho) / 1000;

    if (anchoM <= 0 || longitud <= 0) return;

    const totalMetros   = longitud * numRollos;
    const usdPorMetro   = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
    const subtotalEUR   = usdPorMetro * totalMetros * tc;
    const proporcion    = totalEUR > 0 ? subtotalEUR / totalEUR : 0;
    const costeFinalEUR = subtotalEUR + gastos * proporcion;

    const totalM2        = totalMetros * anchoM;
    const nuevoPrecioM2  = totalM2 > 0
      ? Math.round((costeFinalEUR / totalM2) * 10000) / 10000
      : 0;

    if (nuevoPrecioM2 <= 0) return;

    let materialNombre, espesorVal, colorVal, lonasVal, acabadoVal;

    if (b.tarifaMaterialId === '__nuevo__') {
      // T-74: usar b.material (tipo seleccionado por el usuario) si existe,
      // si no, caer en b.referencia como antes para retrocompatibilidad
      materialNombre = b.material?.trim() || b.referencia?.trim();
      espesorVal = n(b.espesor);
      if (!materialNombre || espesorVal <= 0) return;

      const existente = await db.tarifaMaterial.findFirst({
        where: { material: materialNombre, espesor: espesorVal },
      });
      if (existente) {
        await db.tarifaMaterial.update({ where: { id: existente.id }, data: { precio: nuevoPrecioM2 } });
        colorVal   = existente.color ?? null;
        lonasVal   = existente.lonas ?? null;
        acabadoVal = existente.acabado ?? null;
      } else {
        const creada = await db.tarifaMaterial.create({
          data: { material: materialNombre, espesor: espesorVal, precio: nuevoPrecioM2, peso: 0 },
        });
        colorVal   = creada.color ?? null;
        lonasVal   = creada.lonas ?? null;
        acabadoVal = creada.acabado ?? null;
      }
    } else {
      const tarifa = await db.tarifaMaterial.update({
        where: { id: b.tarifaMaterialId },
        data: { precio: nuevoPrecioM2 },
      });
      materialNombre = tarifa.material;
      espesorVal     = tarifa.espesor;
      colorVal       = tarifa.color   || null;
      lonasVal       = tarifa.lonas   ?? null;
      acabadoVal     = tarifa.acabado || null;
    }

    // Registrar también en TarifaCoste para historial de costes de importación
    if (materialNombre && espesorVal > 0) {
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
    }
  }));

  const fallidos = resultados.filter(r => r.status === 'rejected');
  if (fallidos.length > 0) {
    logApiError(
      new Error(`${fallidos.length}/${candidatas.length} tarifas no actualizadas`),
      'actualizarPrecioMateriales'
    );
  }
}
