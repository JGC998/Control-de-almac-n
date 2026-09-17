"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Scale, TrendingUp, TrendingDown, Minus, Info, GitCompare } from 'lucide-react';
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

function TablaComparativa({ data1, data2, imp1, imp2, importaciones }) {
  const filas = useMemo(() => {
    if (!data1?.resultados || !data2?.resultados) return [];
    const map = {};
    data1.resultados.forEach(r => { map[r.referencia] = { r1: r, r2: null }; });
    data2.resultados.forEach(r => {
      if (map[r.referencia]) map[r.referencia].r2 = r;
      else map[r.referencia] = { r1: null, r2: r };
    });
    return Object.values(map).sort((a, b) => {
      const refA = (a.r1 || a.r2).referencia;
      const refB = (b.r1 || b.r2).referencia;
      return refA.localeCompare(refB);
    });
  }, [data1, data2]);

  const label1 = imp1 ? (imp1.descripcion || imp1.numContenedor || `ID ${imp1.id?.slice(0,8)}`) : '—';
  const label2 = imp2 ? (imp2.descripcion || imp2.numContenedor || `ID ${imp2.id?.slice(0,8)}`) : '—';

  if (filas.length === 0) return null;

  return (
    <div className="card bg-base-100 shadow overflow-x-auto">
      <table className="table table-sm w-full">
        <thead>
          <tr>
            <th>Referencia</th>
            <th className="text-right text-primary">Coste A — {label1}</th>
            <th className="text-right text-secondary">Coste B — {label2}</th>
            <th className="text-right font-bold">Δ Coste</th>
            <th className="text-right">Precio venta</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ r1, r2 }, i) => {
            const ref = (r1 || r2).referencia;
            const c1  = r1?.costeRealM ?? null;
            const c2  = r2?.costeRealM ?? null;
            const delta = c1 != null && c2 != null && c1 > 0
              ? ((c2 - c1) / c1) * 100
              : null;
            const pv = r1?.precioVentaM ?? r2?.precioVentaM ?? null;
            return (
              <tr key={i} className="hover">
                <td>
                  <div className="font-semibold">{ref}</div>
                  <div className="text-xs text-base-content/40">
                    {(r1 || r2).espesor ? `${(r1 || r2).espesor} mm` : ''}
                  </div>
                </td>
                <td className="text-right font-mono text-primary">{fmtE(c1)}</td>
                <td className="text-right font-mono text-secondary">{fmtE(c2)}</td>
                <td className={`text-right font-mono font-bold ${
                  delta == null ? 'text-base-content/30' :
                  delta > 5    ? 'text-error' :
                  delta < -5   ? 'text-success' : 'text-base-content/60'
                }`}>
                  {delta != null ? (
                    <span className="flex items-center justify-end gap-0.5">
                      {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {delta > 0 ? '+' : ''}{fmt(delta, 1)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="text-right font-mono text-base-content/50">{fmtE(pv)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalisisRentabilidadPage() {
  const { data: importaciones } = useSWR('/api/importaciones', fetcher);
  const [importacionId, setImportacionId] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [modoComparar, setModoComparar] = useState(false);
  const [importacionId2, setImportacionId2] = useState('');

  const { data, isLoading, error } = useSWR(
    importacionId ? `/api/importaciones/${importacionId}/analisis-rentabilidad` : null,
    fetcher
  );

  const { data: data2, isLoading: isLoading2 } = useSWR(
    modoComparar && importacionId2 ? `/api/importaciones/${importacionId2}/analisis-rentabilidad` : null,
    fetcher
  );

  const imp1 = importaciones?.find(i => i.id === importacionId);
  const imp2 = importaciones?.find(i => i.id === importacionId2);

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
        <div className="card-body py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="label-text font-semibold whitespace-nowrap">
              {modoComparar ? 'Importación A:' : 'Importación a analizar:'}
            </label>
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
            <button
              className={`btn btn-sm gap-1.5 ${modoComparar ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => { setModoComparar(v => !v); setImportacionId2(''); }}
            >
              <GitCompare className="w-4 h-4" />
              {modoComparar ? 'Cancelar comparación' : 'Comparar dos'}
            </button>
          </div>

          {modoComparar && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="label-text font-semibold whitespace-nowrap">Importación B:</label>
              <select
                className="select select-bordered flex-1 max-w-sm select-secondary"
                value={importacionId2}
                onChange={e => setImportacionId2(e.target.value)}
              >
                <option value="">— Selecciona la segunda importación —</option>
                {importaciones?.filter(i => i.id !== importacionId).map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.descripcion || `Importación ${imp.id.slice(0, 8)}…`}
                    {imp.numContenedor ? ` — ${imp.numContenedor}` : ''}
                    {imp.creadaEn ? ` (${new Date(imp.creadaEn).toLocaleDateString('es-ES')})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {data && !modoComparar && (
            <p className="text-xs text-base-content/50">
              <Info className="w-3 h-3 inline mr-1" />
              Margen mínimo configurado: {data.margenMinimoPct}% — cambia en Configuración → clave <code>margen_minimo_alerta</code>
            </p>
          )}
        </div>
      </div>

      {(isLoading || isLoading2) && (
        <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
      )}

      {error && (
        <div className="alert alert-error">Error al cargar el análisis. Inténtalo de nuevo.</div>
      )}

      {/* Modo comparación */}
      {modoComparar && importacionId && importacionId2 && data && data2 && (
        <div className="space-y-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-secondary" /> Comparativa de costes por bobina
          </h2>
          <TablaComparativa
            data1={data} data2={data2}
            imp1={imp1} imp2={imp2}
            importaciones={importaciones}
          />
          <p className="text-xs text-base-content/40">
            Δ Coste: variación del coste por metro entre la importación A y B. Rojo = coste sube &gt;5%, verde = baja &gt;5%.
          </p>
        </div>
      )}

      {!modoComparar && data && resumen && (
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
                  <th className="text-right">Coste este envío</th>
                  <th className="text-right text-base-content/50">Coste histórico</th>
                  <th className="text-right text-base-content/50">Variación coste</th>
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
                    <td className="text-right font-mono">
                      {r.metros != null
                        ? r.metros.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m'
                        : '—'}
                    </td>
                    <td className="text-right font-mono text-primary">{fmtE(r.costeRealM)}</td>
                    <td className="text-right font-mono text-base-content/40">
                      {r.precioCosteHistoricoM != null ? fmtE(r.precioCosteHistoricoM) : <span className="opacity-40">—</span>}
                    </td>
                    <td className={`text-right font-mono text-sm font-semibold ${
                      r.variacionCostePct == null ? 'text-base-content/30' :
                      r.variacionCostePct > 5    ? 'text-error' :
                      r.variacionCostePct < -5   ? 'text-success' : 'text-base-content/60'
                    }`}>
                      {r.variacionCostePct != null ? (
                        <span className="flex items-center justify-end gap-0.5">
                          {r.variacionCostePct > 0 ? <TrendingUp className="w-3 h-3" /> : r.variacionCostePct < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {r.variacionCostePct > 0 ? '+' : ''}{r.variacionCostePct}%
                        </span>
                      ) : '—'}
                    </td>
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
              <p><strong>Variación coste</strong>: comparación vs el último contenedor anterior del mismo material. Rojo = sube &gt;5%, verde = baja &gt;5%.</p>
              <p><strong>🔴 Bajo coste</strong>: el precio de venta actual no cubre el coste de importación.</p>
              <p><strong>🟡 Margen bajo</strong>: cubre el coste pero está por debajo del margen mínimo configurado.</p>
              <p><strong>🟢 Rentable</strong>: margen ≥ {data.margenMinimoPct}%.</p>
            </div>
          </details>
        </>
      )}

      {!importacionId && !isLoading && !modoComparar && (
        <div className="text-center py-16 text-base-content/40">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona una importación guardada para ver el análisis</p>
        </div>
      )}
      {modoComparar && (!importacionId || !importacionId2) && !isLoading && (
        <div className="text-center py-16 text-base-content/40">
          <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona las dos importaciones para comparar sus costes</p>
        </div>
      )}
    </div>
  );
}
