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
  }).catch(e => {
    // Limpiar la promesa para que el próximo intento reintente la query
    _margenesPromise = null;
    throw e;
  });
  return _margenesPromise;
}

export function clearMargenesCache() {
  _margenesCache = null;
  _margenesCacheTs = 0;
}

// ── Caché del coste de vulcanizado (costeVulcanizadoMetro) ──────────────
let _vulcCache = null;
let _vulcCacheTs = 0;

export async function getCosteVulcanizado() {
  if (_vulcCache !== null && Date.now() - _vulcCacheTs < MARGENES_TTL) return _vulcCache;
  const c = await db.config.findUnique({ where: { key: 'costeVulcanizadoMetro' } });
  _vulcCache = c ? parseFloat(c.value) || 0 : 0;
  _vulcCacheTs = Date.now();
  return _vulcCache;
}

export function clearVulcanizadoCache() { _vulcCache = null; _vulcCacheTs = 0; }

// ── Caché de modelos de grapa (raramente cambian) ────────────────────────
let _modelosGrapaCache = null;
let _modelosGrapaTs = 0;

export async function getModelosGrapa() {
  if (_modelosGrapaCache && Date.now() - _modelosGrapaTs < MARGENES_TTL) return _modelosGrapaCache;
  _modelosGrapaCache = await db.modeloGrapa.findMany({
    where: { activo: true },
    orderBy: { espesorDesde: 'asc' },
  });
  _modelosGrapaTs = Date.now();
  return _modelosGrapaCache;
}

export function clearModelosGrapaCache() { _modelosGrapaCache = null; _modelosGrapaTs = 0; }
