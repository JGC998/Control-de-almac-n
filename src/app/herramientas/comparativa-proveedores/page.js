"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingDown, TrendingUp, Factory, Calendar } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

const fmt  = (v, d = 4) => (v != null ? Number(v).toFixed(d) : '—');
const fmtE = (v) => v != null ? `${fmt(v, 4)} €/m` : '—';

// Colores para las líneas de cada proveedor
const COLORES = ['#570DF8', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316'];

export default function ComparativaProveedoresPage() {
  const [material, setMaterial] = useState('');

  // Cargar lista de materiales disponibles
  const { data: listaMateriales } = useSWR('/api/pedidos-proveedores-data/analisis-precios', fetcher);

  // Cargar análisis para el material seleccionado
  const { data, isLoading, error } = useSWR(
    material ? `/api/pedidos-proveedores-data/analisis-precios?material=${encodeURIComponent(material)}` : null,
    fetcher
  );

  // Construir datos para el gráfico de líneas
  const chartData = useMemo(() => {
    if (!data?.proveedores) return [];
    // Todas las fechas únicas ordenadas
    const fechas = [...new Set(
      data.proveedores.flatMap(p => p.puntos.map(x => x.fecha.slice(0, 10)))
    )].sort();

    return fechas.map(fecha => {
      const punto = { fecha };
      data.proveedores.forEach(p => {
        // Último precio conocido en o antes de esta fecha
        const pp = [...p.puntos]
          .filter(x => x.fecha.slice(0, 10) <= fecha)
          .pop();
        if (pp) punto[p.nombre] = pp.precioMetro;
      });
      return punto;
    });
  }, [data]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Cabecera */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-info/10 rounded-xl">
          <Factory className="w-8 h-8 text-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Comparativa de precios por proveedor</h1>
          <p className="text-base-content/60 mt-1">
            Evolución histórica del precio €/metro para cada proveedor. Ayuda a negociar y elegir mejor.
          </p>
        </div>
      </div>

      {/* Selector de material */}
      <div className="card bg-base-100 shadow">
        <div className="card-body py-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="label-text font-semibold whitespace-nowrap">Material:</label>
            <select
              className="select select-bordered flex-1 max-w-xs"
              value={material}
              onChange={e => setMaterial(e.target.value)}
            >
              <option value="">— Selecciona material —</option>
              {listaMateriales?.materiales?.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {material && data && (
              <span className="badge badge-info badge-outline">
                {data.proveedores?.length} proveedor{data.proveedores?.length !== 1 ? 'es' : ''} con datos
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>}
      {error    && <div className="alert alert-error">Error al cargar los datos.</div>}

      {data?.proveedores?.length === 0 && (
        <div className="alert alert-info">No hay pedidos a proveedores registrados para este material todavía.</div>
      )}

      {data?.proveedores?.length > 0 && (
        <>
          {/* Gráfico de evolución */}
          {chartData.length > 1 && (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h2 className="card-title text-base mb-4">Evolución del precio €/metro</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v} €`} />
                      <Tooltip formatter={(v) => [`${Number(v).toFixed(4)} €/m`]} />
                      <Legend />
                      {data.proveedores.map((p, i) => (
                        <Line
                          key={p.proveedorId}
                          type="monotone"
                          dataKey={p.nombre}
                          stroke={COLORES[i % COLORES.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tabla comparativa */}
          <div className="card bg-base-100 shadow overflow-x-auto">
            <div className="card-body pb-2">
              <h2 className="card-title text-base mb-3">Resumen por proveedor — {material}</h2>
            </div>
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Proveedor</th>
                  <th className="text-right">Último precio</th>
                  <th className="text-right">Precio medio</th>
                  <th className="text-right">Mínimo hist.</th>
                  <th className="text-right">Máximo hist.</th>
                  <th className="text-right">Nº pedidos</th>
                  <th className="text-right">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {data.proveedores.map((p, i) => {
                  const esMasBarato = i === 0; // ya viene ordenado por precio ascendente
                  const variacion = p.puntos.length >= 2
                    ? p.puntos[p.puntos.length - 1].precioMetro - p.puntos[0].precioMetro
                    : 0;
                  return (
                    <tr key={p.proveedorId} className={`hover ${esMasBarato ? 'bg-success/5' : ''}`}>
                      <td>
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                      </td>
                      <td>
                        <span className="font-semibold">{p.nombre}</span>
                        {esMasBarato && <span className="ml-2 badge badge-success badge-xs">más barato</span>}
                      </td>
                      <td className="text-right font-mono font-bold text-primary">{fmtE(p.ultimoPrecio)}</td>
                      <td className="text-right font-mono">{fmtE(p.precioMedio)}</td>
                      <td className="text-right font-mono text-success">{fmtE(p.precioMin)}</td>
                      <td className="text-right font-mono text-error">{fmtE(p.precioMax)}</td>
                      <td className="text-right">{p.numPedidos}</td>
                      <td className="text-right text-sm text-base-content/60">
                        <span className="flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3" />
                          {p.ultimaFecha ? new Date(p.ultimaFecha).toLocaleDateString('es-ES') : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Diferencia entre el más barato y el más caro */}
            {data.proveedores.length >= 2 && (() => {
              const diff = data.proveedores[data.proveedores.length - 1].ultimoPrecio - data.proveedores[0].ultimoPrecio;
              const pct  = data.proveedores[0].ultimoPrecio > 0
                ? (diff / data.proveedores[0].ultimoPrecio) * 100
                : 0;
              return (
                <div className="p-4 border-t border-base-200">
                  <p className="text-sm text-base-content/70">
                    <TrendingDown className="w-4 h-4 inline text-success mr-1" />
                    Comprando a <strong>{data.proveedores[0].nombre}</strong> en vez de <strong>{data.proveedores[data.proveedores.length - 1].nombre}</strong> ahorras{' '}
                    <strong className="text-success">{fmt(diff, 4)} €/m ({pct.toFixed(1)}%)</strong> al precio actual.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Detalle de puntos históricos */}
          <details className="card bg-base-100 shadow">
            <summary className="card-body cursor-pointer font-semibold py-3 select-none">
              Ver todos los puntos históricos ({data.proveedores.reduce((s, p) => s + p.puntos.length, 0)} registros)
            </summary>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Referencia</th>
                    <th className="text-right">Espesor</th>
                    <th className="text-right">Ancho</th>
                    <th className="text-right">€/metro</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.proveedores.flatMap(p =>
                    p.puntos.map((punto, j) => (
                      <tr key={`${p.proveedorId}-${j}`} className="hover">
                        <td className="font-mono text-xs">{new Date(punto.fecha).toLocaleDateString('es-ES')}</td>
                        <td>{p.nombre}</td>
                        <td className="text-xs text-base-content/60">{punto.referencia || '—'}</td>
                        <td className="text-right">{punto.espesor ? `${punto.espesor} mm` : '—'}</td>
                        <td className="text-right">{punto.ancho ? `${punto.ancho} mm` : '—'}</td>
                        <td className="text-right font-mono font-bold">{fmtE(punto.precioMetro)}</td>
                        <td><span className="badge badge-xs badge-ghost">{punto.tipo}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {!material && !isLoading && (
        <div className="text-center py-16 text-base-content/40">
          <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un material para ver la comparativa entre proveedores</p>
        </div>
      )}
    </div>
  );
}
