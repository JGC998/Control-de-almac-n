import { db } from '@/lib/db';

// ── Caché de reglas de margen ─────────────────────────────────────────────
// Los márgenes cambian raramente (solo desde Configuración).
// Se cachean 5 minutos en memoria de proceso para evitar una query extra
// en cada generación de PDF, email de presupuesto y cálculo de precios.

const MARGENES_TTL = 5 * 60 * 1000; // 5 minutos
let _margenesCache = null;
let _margenesCacheTs = 0;
let _margenesPromise = null;
let _margenesGen = 0; // evita que un fetch en vuelo sobreescriba una invalidación posterior

export async function getMargenes() {
  const now = Date.now();
  if (_margenesCache && now - _margenesCacheTs < MARGENES_TTL) return _margenesCache;
  if (_margenesPromise) return _margenesPromise;
  const gen = ++_margenesGen;
  _margenesPromise = db.reglaMargen.findMany().then(data => {
    if (gen === _margenesGen) {
      _margenesCache = data;
      _margenesCacheTs = Date.now();
    }
    _margenesPromise = null;
    return data;
  }).catch(e => {
    _margenesPromise = null;
    throw e;
  });
  return _margenesPromise;
}

export function clearMargenesCache() {
  _margenesCache = null;
  _margenesCacheTs = 0;
  _margenesGen++;
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

// ── Caché del tipo de IVA (iva_rate) ────────────────────────────────────────
let _ivaCache = null;
let _ivaCacheTs = 0;

export async function getIvaRate() {
  if (_ivaCache !== null && Date.now() - _ivaCacheTs < MARGENES_TTL) return _ivaCache;
  const c = await db.config.findUnique({ where: { key: 'iva_rate' } });
  const raw = c ? parseFloat(c.value) : 0.21;
  _ivaCache = raw > 1 ? raw / 100 : raw;
  _ivaCacheTs = Date.now();
  return _ivaCache;
}

export function clearIvaCache() { _ivaCache = null; _ivaCacheTs = 0; }
