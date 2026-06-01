import { db } from '@/lib/db';

// ── Caché de reglas de margen ─────────────────────────────────────────────
// Los márgenes cambian raramente (solo desde Configuración).
// Se cachean 5 minutos en memoria de proceso para evitar una query extra
// en cada generación de PDF, email de presupuesto y cálculo de precios.

const MARGENES_TTL = 5 * 60 * 1000; // 5 minutos
let _margenesCache = null;
let _margenesCacheTs = 0;

export async function getMargenes() {
  const now = Date.now();
  if (_margenesCache && now - _margenesCacheTs < MARGENES_TTL) return _margenesCache;
  _margenesCache = await db.reglaMargen.findMany();
  _margenesCacheTs = now;
  return _margenesCache;
}

export function clearMargenesCache() {
  _margenesCache = null;
  _margenesCacheTs = 0;
}
