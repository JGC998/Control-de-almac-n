import { db } from '@/lib/db';

// ── Caché de reglas de margen ─────────────────────────────────────────────
// Los márgenes cambian raramente (solo desde Configuración).
// Se cachean 5 minutos en memoria de proceso para evitar una query extra
// en cada generación de PDF, email de presupuesto y cálculo de precios.

const MARGENES_TTL = 5 * 60 * 1000; // 5 minutos
let _margenesCache = null;
let _margenesCacheTs = 0;
let _margenesPromise = null;

export async function getMargenes() {
  const now = Date.now();
  if (_margenesCache && now - _margenesCacheTs < MARGENES_TTL) return _margenesCache;
  if (_margenesPromise) return _margenesPromise;
  _margenesPromise = db.reglaMargen.findMany().then(data => {
    _margenesCache = data;
    _margenesCacheTs = Date.now();
    _margenesPromise = null;
    return data;
  });
  return _margenesPromise;
}

export function clearMargenesCache() {
  _margenesCache = null;
  _margenesCacheTs = 0;
}
