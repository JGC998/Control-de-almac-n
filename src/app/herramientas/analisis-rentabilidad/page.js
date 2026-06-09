"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Scale, TrendingUp, TrendingDown, Minus, Info, ChevronDown } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

const fmt = (v, d = 2) => (isFinite(v) && v != null
  ? Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
  : '—');
const fmtE = (v) => v != null ? `${fmt(v, 4)} €/m` : '—';

function Semaforo({ color }) {
  const map = {
    verde:    { cls: 'badge-success', label: '🟢 Rentable' },
    amarillo: { cls: 'badge-warning', label: '🟡 Margen bajo' },
    rojo:     { cls: 'badge-error',   label: '🔴 Bajo coste' },
    gris:     { cls: 'badge-ghost',   label: '⚫ Sin tarifa' },
  };
  const s = map[color] || map.gris;
  return <span className={`badge badge-sm ${s.cls}`}>{s.label}</span>;
}

export default function AnalisisRentabilidadPage() {
  const { data: importaciones } = useSWR('/api/importaciones', fetcher);
  const [importacionId, setImportacionId] = useState('');
  const [abierto, setAbierto] = useState(false);

  const { data, isLoading, error } = useSWR(
    importacionId ? `/api/importaciones/${importacionId}/analisis-rentabilidad` : null,
    fetcher
  );

  const resumen = useMemo(() => {
    if (!data?.resultados) return null;
    const conDatos = data.resultados.filter(r => r.margenRealPct != null);
    return {
      total: data.resultados.length,
      verdes:    data.resultados.filter(r => r.semaforo === 'verde').length,
      amarillos: data.resultados.filter(r => r.semaforo === 'amarillo').length,
      rojos:     data.resultados.filter(r => r.semaforo === 'rojo').length,
      sinTarifa: data.resultados.filter(r => r.semaforo === 'gris').length,
      margenMedio: conDatos.length > 0
        ? conDatos.reduce((s, r) => s + r.margenRealPct, 0) / conDatos.length
        : null,
    };
  }, [data]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-warning/10 rounded-xl">
          <Scale className="w-8 h-8 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Semáforo de rentabilidad</h1>
          <p className="text-base-content/60 mt-1">
            Compara el coste real de cada bobina importada con el precio de venta actual en tus tarifas.
            Solo lectura — no modifica ningún precio.
          </p>
        </div>
      </div>

      {/* Selector */}
      <div className="card bg-base-100 shadow">
        <div className="card-body py-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="label-text font-semibold whitespace-nowrap">Importación a analizar:</label>
            <select
              className="select select-bordered flex-1 max-w-sm"
              value={importacionId}
              onChange={e => setImportacionId(e.target.value)}
            >
              <option value="">— Selecciona una importación guardada —</option>
              {importaciones?.map(imp => (
                <option key={imp.id} value={imp.id}>
                  {imp.descripcion || `Importación ${imp.id.slice(0, 8)}…`}
                  {imp.numContenedor ? ` — ${imp.numContenedor}` : ''}
                  {imp.creadaEn ? ` (${new Date(imp.creadaEn).toLocaleDateString('es-ES')})` : ''}
                </option>
              ))}
            </select>
          </div>
          {data && (
            <p className="text-xs text-base-content/50 mt-1">
              <Info className="w-3 h-3 inline mr-1" />
              Margen mínimo configurado: {data.margenMinimoPct}% — cambia en Configuración → clave <code>margen_minimo_alerta</code>
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
      )}

      {error && (
        <div className="alert alert-error">Error al cargar el análisis. Inténtalo de nuevo.</div>
      )}

      {data && resumen && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="stat bg-base-100 shadow rounded-xl py-3">
              <div className="stat-title text-xs">Total artículos</div>
              <div className="stat-value text-xl">{resumen.total}</div>
            </div>
            <div className="stat bg-success/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-success">Rentables</div>
              <div className="stat-value text-xl text-success">{resumen.verdes}</div>
            </div>
            <div className="stat bg-warning/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-warning">Margen bajo</div>
              <div className="stat-value text-xl text-warning">{resumen.amarillos}</div>
            </div>
            <div className="stat bg-error/10 shadow rounded-xl py-3">
              <div className="stat-title text-xs text-error">Bajo coste</div>
              <div className="stat-value text-xl text-error">{resumen.rojos}</div>
            </div>
            <div className="stat bg-base-100 shadow rounded-xl py-3">
              <div className="stat-title text-xs">Margen medio</div>
              <div className={`stat-value text-xl ${resumen.margenMedio != null && resumen.margenMedio >= data.margenMinimoPct ? 'text-success' : 'text-error'}`}>
                {resumen.margenMedio != null ? `${resumen.margenMedio.toLocaleString('es-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%` : '—'}
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="card bg-base-100 shadow overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th className="text-right">Metros</th>
                  <th className="text-right">Coste real €/m</th>
                  <th className="text-right">Precio venta €/m</th>
                  <th className="text-right">Margen real</th>
                  <th className="text-right">Precio mínimo</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((r, i) => (
                  <tr key={i} className={`hover ${r.semaforo === 'rojo' ? 'bg-error/5' : r.semaforo === 'amarillo' ? 'bg-warning/5' : ''}`}>
                    <td>
                      <div className="font-semibold">{r.referencia}</div>
                      <div className="text-xs text-base-content/50">
                        {r.espesor ? `${r.espesor} mm` : ''}{r.ancho ? ` · ${r.ancho} mm` : ''}
                      </div>
                    </td>
                    <td className="text-right font-mono">{fmt(r.metros, 1)}</td>
                    <td className="text-right font-mono text-primary">{fmtE(r.costeRealM)}</td>
                    <td className="text-right font-mono">
                      {r.precioVentaM != null ? fmtE(r.precioVentaM) : <span className="opacity-40">Sin tarifa</span>}
                    </td>
                    <td className={`text-right font-mono font-bold ${
                      r.margenRealPct == null ? 'opacity-40' :
                      r.margenRealPct >= data.margenMinimoPct ? 'text-success' :
                      r.margenRealPct >= 0 ? 'text-warning' : 'text-error'
                    }`}>
                      {r.margenRealPct != null ? `${r.margenRealPct >= 0 ? '+' : ''}${fmt(r.margenRealPct, 1)}%` : '—'}
                    </td>
                    <td className="text-right font-mono text-base-content/60">{fmtE(r.precioMinimo)}</td>
                    <td className="text-center"><Semaforo color={r.semaforo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <details className="text-sm text-base-content/60">
            <summary className="cursor-pointer hover:text-base-content">¿Cómo se calcula esto?</summary>
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-base-300">
              <p><strong>Coste real €/m</strong>: precio USD/m de compra × tipo de cambio + gastos prorrateados por valor económico.</p>
              <p><strong>Precio venta</strong>: se busca en tus tarifas-rollo por material + espesor ± ancho.</p>
              <p><strong>Precio mínimo</strong>: coste real × (1 + {data.margenMinimoPct}% margen mínimo configurado).</p>
              <p><strong>🔴 Bajo coste</strong>: el precio de venta actual no cubre el coste de importación.</p>
              <p><strong>🟡 Margen bajo</strong>: cubre el coste pero está por debajo del margen mínimo configurado.</p>
              <p><strong>🟢 Rentable</strong>: margen ≥ {data.margenMinimoPct}%.</p>
            </div>
          </details>
        </>
      )}

      {!importacionId && !isLoading && (
        <div className="text-center py-16 text-base-content/40">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona una importación guardada para ver el análisis</p>
        </div>
      )}
    </div>
  );
}
