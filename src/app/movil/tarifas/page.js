'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { loadOffline } from '@/lib/offlineSync';

export default function MovilTarifasPage() {
  const [tarifas, setTarifas] = useState(null);
  const [ts, setTs] = useState(null);
  const [offline, setOffline] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    fetch('/api/precios')
      .then(r => r.json())
      .then(d => { setTarifas(d); setOffline(false); })
      .catch(async () => {
        const cached = await loadOffline('/api/precios');
        if (cached) { setTarifas(cached.data); setOffline(true); setTs(cached.ts); }
      });
  }, []);

  const grupos = useMemo(() => {
    if (!tarifas) return {};
    const q = filtro.toLowerCase();
    const filtradas = q
      ? tarifas.filter(t => t.material?.toLowerCase().includes(q) || String(t.espesor).includes(q))
      : tarifas;
    return filtradas.reduce((acc, t) => {
      const mat = t.material ?? '—';
      if (!acc[mat]) acc[mat] = [];
      acc[mat].push(t);
      return acc;
    }, {});
  }, [tarifas, filtro]);

  return (
    <div className="flex flex-col min-h-screen max-w-sm mx-auto w-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-base-200 bg-base-100 sticky top-0 z-10">
        <Link href="/movil" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <p className="font-semibold text-sm leading-none">Tarifas de material</p>
          {offline && ts && (
            <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
              <WifiOff className="w-3 h-3" /> Sin red · {new Date(ts).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="px-4 py-2 border-b border-base-200 bg-base-100 sticky top-12 z-10">
        <input
          className="input input-bordered input-sm w-full"
          placeholder="Buscar material o espesor…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {!tarifas && (
          <div className="flex justify-center py-10"><span className="loading loading-spinner" /></div>
        )}
        {tarifas && Object.keys(grupos).length === 0 && (
          <p className="text-center text-base-content/40 py-10 text-sm">Sin resultados</p>
        )}
        {Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).map(([material, rows]) => (
          <div key={material}>
            <p className="text-xs font-bold uppercase tracking-wide text-base-content/50 mb-2">{material}</p>
            <div className="overflow-x-auto rounded-lg border border-base-300">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Espesor</th>
                    <th>Acabado</th>
                    <th className="text-right">€/m²</th>
                    <th className="text-right">kg/m²</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.sort((a, b) => Number(a.espesor) - Number(b.espesor)).map((t, i) => (
                    <tr key={i}>
                      <td className="font-mono">{t.espesor} mm</td>
                      <td className="text-base-content/60">{t.acabado || t.color || '—'}</td>
                      <td className="text-right font-mono font-semibold">{Number(t.precio).toFixed(2)}</td>
                      <td className="text-right font-mono text-base-content/50">{Number(t.peso ?? 0).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
