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
let _vulcPromise = null;

export async function getCosteVulcanizado() {
  if (_vulcCache !== null && Date.now() - _vulcCacheTs < MARGENES_TTL) return _vulcCache;
  if (_vulcPromise) return _vulcPromise;
  _vulcPromise = db.config.findUnique({ where: { key: 'costeVulcanizadoMetro' } })
    .then(c => {
      _vulcCache = c ? parseFloat(c.value) || 0 : 0;
      _vulcCacheTs = Date.now();
      _vulcPromise = null;
      return _vulcCache;
    }).catch(e => { _vulcPromise = null; throw e; });
  return _vulcPromise;
}

export function clearVulcanizadoCache() { _vulcCache = null; _vulcCacheTs = 0; }

// ── Caché de modelos de grapa (raramente cambian) ────────────────────────
let _modelosGrapaCache = null;
let _modelosGrapaTs = 0;
let _modelosGrapaPromise = null;

export async function getModelosGrapa() {
  if (_modelosGrapaCache && Date.now() - _modelosGrapaTs < MARGENES_TTL) return _modelosGrapaCache;
  if (_modelosGrapaPromise) return _modelosGrapaPromise;
  _modelosGrapaPromise = db.modeloGrapa.findMany({ where: { activo: true }, orderBy: { espesorDesde: 'asc' } })
    .then(data => {
      _modelosGrapaCache = data;
      _modelosGrapaTs = Date.now();
      _modelosGrapaPromise = null;
      return data;
    }).catch(e => { _modelosGrapaPromise = null; throw e; });
  return _modelosGrapaPromise;
}

export function clearModelosGrapaCache() { _modelosGrapaCache = null; _modelosGrapaTs = 0; }

// ── Caché del tipo de IVA (iva_rate) ────────────────────────────────────────
let _ivaCache = null;
let _ivaCacheTs = 0;
let _ivaPromise = null;

export async function getIvaRate() {
  if (_ivaCache !== null && Date.now() - _ivaCacheTs < MARGENES_TTL) return _ivaCache;
  if (_ivaPromise) return _ivaPromise;
  _ivaPromise = db.config.findUnique({ where: { key: 'iva_rate' } })
    .then(c => {
      const raw = c && c.value ? parseFloat(c.value) : 0.21;
      // Protección contra valores corruptos o vacíos que producirían NaN
      _ivaCache = (!raw || isNaN(raw) || raw < 0) ? 0.21 : (raw > 1 ? raw / 100 : raw);
      _ivaCacheTs = Date.now();
      _ivaPromise = null;
      return _ivaCache;
    }).catch(e => { _ivaPromise = null; throw e; });
  return _ivaPromise;
}

export function clearIvaCache() { _ivaCache = null; _ivaCacheTs = 0; }
