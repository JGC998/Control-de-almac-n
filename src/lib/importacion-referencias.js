import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

/**
 * Después de guardar una importación, crea en ReferenciaBobina las bobinas
 * con referencia que todavía no existan en la tabla.
 * Solo actúa sobre artículos de tipo BOBINA con referencia no vacía.
 * No modifica entradas existentes — es un alta silenciosa.
 *
 * Fire-and-forget — llamar con .catch(() => {}).
 */
export async function sincronizarReferencias(bovinasRaw) {
  let bobinas;
  try {
    bobinas = typeof bovinasRaw === 'string' ? JSON.parse(bovinasRaw) : bovinasRaw;
  } catch (e) {
    logApiError(e, 'sincronizarReferencias:parse');
    return;
  }
  if (!Array.isArray(bobinas)) return;

  const candidatas = bobinas.filter(b => b.tipo === 'BOBINA' && b.referencia?.trim());

  // Deduplicar por referencia para no lanzar N consultas iguales
  const vistas = new Set();
  for (const b of candidatas) {
    const ref = b.referencia.trim();
    if (vistas.has(ref)) continue;
    vistas.add(ref);

    try {
      const existe = await db.referenciaBobina.findFirst({ where: { referencia: ref } });
      if (existe) continue;

      const ancho   = b.ancho   ? parseFloat(b.ancho)   || null : null;
      const lonas   = b.lonas   ? parseFloat(b.lonas)   || null : null;
      const espesor = b.espesor ? parseFloat(b.espesor) || null : null;

      await db.referenciaBobina.create({
        data: {
          referencia: ref,
          nombre:     b.material  || null,
          ancho:      ancho,
          lonas:      lonas,
          espesoreGoma: espesor,
        },
      });
    } catch (err) {
      // P2002 = ya existe (race condition o constraint) — ignorar silenciosamente
      if (err?.code !== 'P2002') {
        logApiError(err, `sincronizarReferencias: ref "${b.referencia}"`);
      }
    }
  }
}
