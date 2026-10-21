"use client";
import { useState, useEffect } from 'react';
import { saveOffline, loadOffline } from '@/lib/offlineSync';

/**
 * Fetch con fallback a IndexedDB.
 * Devuelve { data, offline, offlineTs }
 *   - offline: true cuando los datos vienen de caché (sin red)
 *   - offlineTs: timestamp (ms) de cuándo se guardó ese caché
 */
export function useOfflineData(url) {
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [offlineTs, setOfflineTs] = useState(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(d => {
        if (cancelled) return;
        setData(d);
        setOffline(false);
        setOfflineTs(null);
        saveOffline(url, d);
      })
      .catch(async () => {
        if (cancelled) return;
        const cached = await loadOffline(url);
        if (cached) {
          setData(cached.data);
          setOffline(true);
          setOfflineTs(cached.ts);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, offline, offlineTs };
}
