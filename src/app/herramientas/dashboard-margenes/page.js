"use client";
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { BarChart2, TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUpDown, Printer } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

const fmt = (v, d = 2) => v != null && isFinite(v)
  ? Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
  : '—';

const fmtEur = (v) => v != null ? `${fmt(v)} €/m²` : '—';

export default function DashboardMargenesPage() {
  const { data: tarifas,      isLoading: loadT } = useSWR('/api/precios',        fetcher);
  const { data: tarifasCoste, isLoading: loadC } = useSWR('/api/tarifas-coste',  fetcher);
  const [orden, setOrden]         = useState('margen_asc'); // margen_asc | margen_desc | material
  const [filtroAlerta, setFiltroAlerta] = useState(false);
  const [filtroMaterial, setFiltroMaterial] = useState('');

  const materialesUnicos = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filas = useMemo(() => {
    if (!Array.isArray(tarifas) || !Array.isArray(tarifasCoste)) return [];

    const costesMap = {};
    tarifasCoste.forEach(tc => {
      const k = `${tc.material}_${tc.espesor}_${tc.color ?? ''}_${tc.lonas ?? ''}_${tc.acabado ?? ''}`;
      costesMap[k] = tc;
    });

    return tarifas.map(tm => {
      const k = `${tm.material}_${tm.espesor}_${tm.color ?? ''}_${tm.lonas ?? ''}_${tm.acabado ?? ''}`;
      const tc = costesMap[k];
      const coste = tc?.precio ?? null;
      const venta = tm.precio;
      const margen = coste != null && coste > 0
        ? ((venta - coste) / coste) * 100
        : null;
      const alerta = margen != null && margen < 15;
      return { tm, coste, venta, margen, alerta, sinCoste: coste == null };
    });
  }, [tarifas, tarifasCoste]);

  const filasFiltradas = useMemo(() => {
    let f = filtroAlerta ? filas.filter(f => f.alerta || f.sinCoste) : filas;
    if (filtroMaterial) f = f.filter(f => f.tm.material === filtroMaterial);
    switch (orden) {
      case 'margen_asc':   return [...f].sort((a, b) => {
        if (a.sinCoste && !b.sinCoste) return 1;
        if (!a.sinCoste && b.sinCoste) return -1;
        return (a.margen ?? Infinity) - (b.margen ?? Infinity);
      });
      case 'margen_desc':  return [...f].sort((a, b) => {
        if (a.sinCoste && !b.sinCoste) return 1;
        if (!a.sinCoste && b.sinCoste) return -1;
        return (b.margen ?? -Infinity) - (a.margen ?? -Infinity);
      });
      case 'material':     return [...f].sort((a, b) => a.tm.material.localeCompare(b.tm.material) || a.tm.espesor - b.tm.espesor);
      default: return f;
    }
  }, [filas, orden, filtroAlerta]);

  const stats = useMemo(() => {
    const conMargen = filas.filter(f => f.margen != null);
    return {
      total: filas.length,
      sinCoste: filas.filter(f => f.sinCoste).length,
      negativos: filas.filter(f => f.margen != null && f.margen < 0).length,
      bajos: filas.filter(f => f.margen != null && f.margen >= 0 && f.margen < 15).length,
      ok: filas.filter(f => f.margen != null && f.margen >= 15).length,
      margenMedio: conMargen.length > 0
        ? conMargen.reduce((s, f) => s + f.margen, 0) / conMargen.length
        : null,
    };
  }, [filas]);

  const isLoading = loadT || loadC;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <style>{`
        @media print {
          nav, header, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-secondary/10 rounded-xl">
          <BarChart2 className="w-8 h-8 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dashboard de márgenes</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Todos los materiales ordenados por margen real (coste importación vs precio de venta base).
            Solo lectura — edita precios en{' '}
            <Link href="/tarifas" className="link link-primary">Tarifas</Link>.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!isLoading && filas.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="stat bg-base-100 shadow rounded-xl py-3">
              <div className="stat-title text-xs">Total materiales</div>
              <div className="stat-value text-xl">{stats.total}</div>
            </div>
            <div className="stat bg-error/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-error">Margen negativo</div>
              <div className="stat-value text-xl text-error">{stats.negativos}</div>
            </div>
            <div className="stat bg-warning/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-warning">Margen bajo (&lt;15%)</div>
              <div className="stat-value text-xl text-warning">{stats.bajos}</div>
            </div>
            <div className="stat bg-success/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-success">Rentables (≥15%)</div>
              <div className="stat-value text-xl text-success">{stats.ok}</div>
            </div>
            <div className="stat bg-base-100 shadow rounded-xl py-3">
              <div className="stat-title text-xs">Margen medio</div>
              <div className={`stat-value text-xl ${stats.margenMedio != null && stats.margenMedio >= 15 ? 'text-success' : 'text-error'}`}>
                {stats.margenMedio != null ? `${fmt(stats.margenMedio, 1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-wrap gap-3 items-center print:hidden">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-base-content/40" />
              <select
                className="select select-bordered select-sm"
                value={orden}
                onChange={e => setOrden(e.target.value)}
              >
                <option value="margen_asc">Peor margen primero</option>
                <option value="margen_desc">Mejor margen primero</option>
                <option value="material">Por material A→Z</option>
              </select>
            </div>
            <select
              className="select select-bordered select-sm"
              value={filtroMaterial}
              onChange={e => setFiltroMaterial(e.target.value)}
            >
              <option value="">Todos los materiales</option>
              {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-warning"
                checked={filtroAlerta}
                onChange={e => setFiltroAlerta(e.target.checked)}
              />
              <span className="text-sm">Solo alertas</span>
              {(stats.negativos + stats.bajos) > 0 && (
                <span className="badge badge-warning badge-sm">{stats.negativos + stats.bajos}</span>
              )}
            </label>
            {stats.sinCoste > 0 && (
              <span className="text-xs text-base-content/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {stats.sinCoste} sin coste registrado
              </span>
            )}
            <button
              className="btn btn-sm btn-outline ml-auto gap-1.5 print:hidden"
              onClick={() => window.print()}
              title="Imprimir / exportar PDF"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>

          {/* Tabla */}
          <div className="card bg-base-100 shadow overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Material</th>
                  <th className="text-center">Espesor</th>
                  <th className="text-center text-base-content/50">Coste imp. (€/m²)</th>
                  <th className="text-center">Precio venta (€/m²)</th>
                  <th className="text-center font-bold">Margen</th>
                  <th className="text-center">Precio mínimo</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((f, i) => {
                  const { tm, coste, venta, margen, sinCoste } = f;
                  const precioMinimo = coste != null ? coste * 1.15 : null;
                  return (
                    <tr
                      key={tm.id}
                      className={`hover ${margen != null && margen < 0 ? 'bg-error/5' : margen != null && margen < 15 ? 'bg-warning/5' : ''}`}
                    >
                      <td>
                        <div className="font-semibold">{tm.material}</div>
                        <div className="text-xs text-base-content/40 space-x-2">
                          {tm.lonas  != null && <span>{tm.lonas} lonas</span>}
                          {tm.acabado        && <span>{tm.acabado}</span>}
                          {tm.color          && <span>{tm.color}</span>}
                        </div>
                      </td>
                      <td className="text-center font-mono">{tm.espesor} mm</td>
                      <td className="text-center font-mono text-base-content/50">
                        {sinCoste
                          ? <span className="badge badge-ghost badge-sm">Sin datos</span>
                          : fmtEur(coste)}
                      </td>
                      <td className="text-center font-mono font-semibold">{fmtEur(venta)}</td>
                      <td className={`text-center font-mono font-bold text-lg ${
                        margen == null     ? 'text-base-content/30' :
                        margen < 0         ? 'text-error' :
                        margen < 15        ? 'text-warning' : 'text-success'
                      }`}>
                        <div className="flex items-center justify-center gap-1">
                          {margen != null && (
                            margen > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
                            margen < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {margen != null ? `${margen >= 0 ? '+' : ''}${fmt(margen, 1)}%` : '—'}
                        </div>
                      </td>
                      <td className="text-center font-mono text-base-content/50 text-sm">
                        {precioMinimo != null
                          ? <span className={venta < precioMinimo ? 'text-error font-semibold' : ''}>{fmtEur(precioMinimo)}</span>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filasFiltradas.length === 0 && (
              <div className="text-center py-8 text-base-content/40 text-sm">No hay materiales con alertas.</div>
            )}
          </div>

          <p className="text-xs text-base-content/40">
            El precio mínimo se calcula con un margen del 15% sobre el coste. Actualiza los costes importando un nuevo contenedor o editando manualmente en la pestaña "Coste" de /tarifas.
          </p>
        </>
      )}

      {!isLoading && filas.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sin datos de tarifas. Ve a <Link href="/tarifas" className="link">Tarifas</Link> y carga los materiales.</p>
        </div>
      )}
    </div>
  );
}
