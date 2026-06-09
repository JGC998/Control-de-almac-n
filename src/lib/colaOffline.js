/**
 * Gestión de la sesión de recepción offline.
 *
 * Guarda UNA sesión activa en IndexedDB (`clave: 'activa'`).
 * La sesión acumula todos los artículos escaneados y lleva la cuenta
 * de cuántos aún no se han confirmado en el servidor.
 *
 * Forma de la sesión:
 * {
 *   clave: 'activa',
 *   realId: null | string,   // ID de la BD tras la primera sincronización
 *   numContenedor: string,
 *   numFactura: string,
 *   descripcion: string,
 *   items: [...bobinas],     // array acumulado de artículos escaneados
 *   pendientes: number,      // artículos añadidos desde la última sync OK
 *   iniciadaEn: number,      // timestamp
 * }
 */

const DB_NAME = 'crm-recepcion-v1';
const STORE   = 'sesion';

let _db = null;

function abrirDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este entorno'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'clave' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

export async function obtenerSesion() {
  try {
    const db = await abrirDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get('activa');
      req.onsuccess = () => res(req.result ?? null);
      req.onerror   = () => rej(req.error);
    });
  } catch {
    return null;
  }
}

export async function guardarSesion(sesion) {
  try {
    const db = await abrirDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ ...sesion, clave: 'activa' });
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });
  } catch (e) {
    console.warn('[colaOffline] No se pudo guardar sesión:', e);
  }
}

export async function borrarSesion() {
  try {
    const db = await abrirDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete('activa');
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });
  } catch { /* noop */ }
}

/**
 * Sincroniza la sesión local con el servidor.
 * - Sin realId: POST a /api/importaciones/borrador → obtiene ID
 * - Con realId: PATCH a /api/importaciones/[id]/bobinas → actualiza lista
 *
 * Devuelve { ok: true, sesion } o { ok: false, razon: string }
 */
export async function sincronizarSesion(sesion) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, razon: 'offline' };
  }

  // BUG-02: preservar IDs originales — renumerarlos sobreescribía referencias
  const bobs = JSON.stringify(sesion.items);

  try {
    let res;
    if (sesion.realId) {
      res = await fetch(`/api/importaciones/${sesion.realId}/bobinas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bobinas: bobs }),
      });
    } else {
      res = await fetch('/api/importaciones/borrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numContenedor: sesion.numContenedor || null,
          numFactura:    sesion.numFactura    || null,
          descripcion:   sesion.descripcion   || null,
          bobinas:       bobs,
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, razon: err.error || `Error ${res.status}` };
    }

    const data = await res.json();
    const actualizada = { ...sesion, realId: data.id, pendientes: 0 };
    await guardarSesion(actualizada);
    return { ok: true, sesion: actualizada };
  } catch {
    return { ok: false, razon: 'Error de red' };
  }
}
