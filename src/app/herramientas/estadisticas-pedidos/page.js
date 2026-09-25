'use client';
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, TrendingUp, Package, ChevronLeft, Timer } from 'lucide-react';

const ESTADO_TALLER_LABEL = { Pendiente: 'Pendiente', EnTaller: 'En taller', Listo: 'Listo', Entregado: 'Entregado' };

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMes(iso) {
  const [y, m] = iso.split('-');
  return new Date(y, m - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

function KPI({ label, value, sub, icon: Icon, color = 'primary' }) {
  return (
    <div className="stat bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
      <div className={`stat-figure text-${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-2xl">{value ?? '—'}</div>
      {sub && <div className="stat-desc">{sub}</div>}
    </div>
  );
}

export default function EstadisticasPedidosPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [familia, setFamilia] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (desde) p.set('desde', desde);
    if (hasta) p.set('hasta', hasta);
    if (familia) p.set('familia', familia);
    return p.toString();
  }, [desde, hasta, familia]);

  const { data, isLoading } = useSWR(
    `/api/pedidos/estadisticas-tiempo${params ? `?${params}` : ''}`,
    fetcher
  );

  const sinDatos = !isLoading && (data?.total ?? 0) === 0;

  return (
    <div className="container mx-auto p-6 max-w-5xl">

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/herramientas" className="btn btn-ghost btn-sm btn-circle">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="bg-secondary/10 rounded-xl p-2.5">
            <Timer className="w-7 h-7 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Estadísticas de pedidos</h1>
            <p className="text-sm text-base-content/50">Tiempo medio desde la creación hasta la entrega</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-base-content/60">Desde</span>
          <input type="date" className="input input-sm input-bordered" value={desde} onChange={e => setDesde(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-base-content/60">Hasta</span>
          <input type="date" className="input input-sm input-bordered" value={hasta} onChange={e => setHasta(e.target.value)} />
        </label>
        {data?.familias?.length > 0 && (
          <select className="select select-sm select-bordered" value={familia} onChange={e => setFamilia(e.target.value)}>
            <option value="">Todas las familias</option>
            {data.familias.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
        {(desde || hasta || familia) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setDesde(''); setHasta(''); setFamilia(''); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Sin datos aún */}
      {sinDatos && (
        <div className="text-center py-20 text-base-content/30">
          <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Sin datos todavía</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">
            Las estadísticas se acumularán conforme los pedidos pasen al estado <strong>Entregado</strong> desde la vista de taller.
          </p>
        </div>
      )}

      {!isLoading && data?.total > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <KPI label="Pedidos completados" value={data.total} icon={Package} color="secondary" />
            <KPI label="Tiempo medio" value={`${data.mediaDias} días`} sub={`Mediana: ${data.mediana} días`} icon={TrendingUp} color="primary" />
            <KPI label="Rango" value={`${Math.min(...data.detalle.map(d => d.dias))}–${Math.max(...data.detalle.map(d => d.dias))} días`} icon={Clock} color="accent" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Gráfico por familia */}
            {data.porFamilia.length > 0 && (
              <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-sm mb-3">Media por familia de producto</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.porFamilia} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-base-200" />
                    <XAxis type="number" unit=" d" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="familia" type="category" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} días`, 'Media']} />
                    <Bar dataKey="mediaDias" radius={[0, 4, 4, 0]}>
                      {data.porFamilia.map((entry, i) => (
                        <Cell key={i} fill={entry.color ?? 'oklch(var(--p))'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tendencia mensual */}
            {data.tendencia.length > 1 && (
              <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm">
                <h2 className="font-semibold text-sm mb-3">Tendencia mensual (días)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.tendencia} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-base-200" />
                    <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 11 }} />
                    <YAxis unit=" d" tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={fmtMes}
                      formatter={(v, _, { payload }) => [`${v} días (${payload?.count} pedidos)`, 'Media']}
                    />
                    <Line type="monotone" dataKey="mediaDias" strokeWidth={2} dot={{ r: 3 }} className="stroke-primary" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

          </div>

          {/* Por tamaño */}
          {data.porTamano.length > 0 && (
            <div className="bg-base-100 border border-base-200 rounded-xl p-4 shadow-sm mb-6">
              <h2 className="font-semibold text-sm mb-3">Tiempo según tamaño del pedido</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.porTamano.map(t => (
                  <div key={t.label} className="flex items-center gap-3 p-3 rounded-lg bg-base-200/50">
                    <div>
                      <p className="text-xs text-base-content/50">{t.label}</p>
                      <p className="text-lg font-bold">{t.mediaDias} días</p>
                      <p className="text-xs text-base-content/40">{t.count} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla detalle */}
          <div className="bg-base-100 border border-base-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-base-200">
              <h2 className="font-semibold text-sm">Últimos pedidos completados</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Familia</th>
                    <th>Ítems</th>
                    <th>Completado</th>
                    <th className="text-right">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {data.detalle.map(p => (
                    <tr key={p.id} className="hover">
                      <td>
                        <Link href={`/pedidos/${p.id}`} className="font-mono text-xs hover:text-primary">
                          {p.numero}
                        </Link>
                      </td>
                      <td className="text-sm">{p.familia}</td>
                      <td className="text-sm tabular-nums">{p.numItems}</td>
                      <td className="text-sm text-base-content/60">{fmtFecha(p.fechaCompletado)}</td>
                      <td className="text-right">
                        <span className={`badge badge-sm ${
                          p.dias <= 3 ? 'badge-success' :
                          p.dias <= 7 ? 'badge-warning' : 'badge-error'
                        }`}>
                          {p.dias}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
