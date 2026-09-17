"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Truck, ArrowLeft, Mail, Phone, MapPin, Package,
  Calendar, TrendingUp, BarChart2, Layers,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

const fmt = (v, d = 2) => v != null
  ? Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
  : '—';

const fmtFecha = (d) => d
  ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const ESTADO_BADGE = {
  PENDIENTE:  'badge-warning',
  ENVIADO:    'badge-info',
  RECIBIDO:   'badge-success',
  CANCELADO:  'badge-error',
};

export default function ProveedorFichaPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useSWR(
    id ? `/api/proveedores/${id}/stats` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div role="alert" className="alert alert-error max-w-md">
          <span>No se ha podido cargar el proveedor.</span>
        </div>
      </div>
    );
  }

  const { proveedor, stats, ultimosPedidos } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Volver */}
      <Link href="/gestion/catalogos/proveedores" className="btn btn-ghost btn-sm gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Proveedores
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl shrink-0">
          <Truck className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-base-content/60">
            {proveedor.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {proveedor.email}
              </span>
            )}
            {proveedor.telefono && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {proveedor.telefono}
              </span>
            )}
            {proveedor.direccion && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {proveedor.direccion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat bg-base-100 shadow rounded-xl py-3">
          <div className="stat-title text-xs flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Pedidos
          </div>
          <div className="stat-value text-2xl">{stats.totalPedidos}</div>
          {stats.primerPedido && (
            <div className="stat-desc text-xs">desde {fmtFecha(stats.primerPedido)}</div>
          )}
        </div>
        <div className="stat bg-base-100 shadow rounded-xl py-3">
          <div className="stat-title text-xs flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Bobinas
          </div>
          <div className="stat-value text-2xl">{stats.totalBobinas}</div>
          <div className="stat-desc text-xs">unidades totales</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-xl py-3">
          <div className="stat-title text-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Gasto total
          </div>
          <div className="stat-value text-xl">{fmt(stats.totalGastos)} €</div>
          <div className="stat-desc text-xs">gastos registrados</div>
        </div>
        <div className="stat bg-base-100 shadow rounded-xl py-3">
          <div className="stat-title text-xs flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Último pedido
          </div>
          <div className="stat-value text-lg leading-tight">
            {stats.ultimoPedido ? fmtFecha(stats.ultimoPedido) : '—'}
          </div>
        </div>
      </div>

      {/* Materiales más comprados */}
      {stats.materialesMasComprados.length > 0 && (
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body py-4">
            <h2 className="card-title text-base flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Materiales más comprados
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              {stats.materialesMasComprados.map(m => (
                <div key={m.material} className="flex items-center gap-2 px-3 py-1.5 bg-base-200 rounded-full">
                  <span className="font-semibold text-sm">{m.material}</span>
                  <span className="text-xs text-base-content/50 font-mono">{m.bobinas} bob.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Últimos pedidos */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body py-4">
          <h2 className="card-title text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-secondary" />
            Últimos pedidos
          </h2>

          {ultimosPedidos.length === 0 ? (
            <p className="text-sm text-base-content/40 py-4">Sin pedidos registrados para este proveedor.</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Material</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th className="text-right">Bobinas</th>
                    <th className="text-right">Gastos</th>
                    <th>Contenedor</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPedidos.map(p => (
                    <tr key={p.id} className="hover">
                      <td className="font-mono text-xs">{fmtFecha(p.fecha)}</td>
                      <td className="font-semibold">{p.material}</td>
                      <td>
                        <span className="badge badge-ghost badge-sm">{p.tipo}</span>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${ESTADO_BADGE[p.estado] ?? 'badge-ghost'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="text-right font-mono">{p.numBobinas}</td>
                      <td className="text-right font-mono">
                        {p.gastosTotales > 0 ? `${fmt(p.gastosTotales)} €` : <span className="opacity-30">—</span>}
                      </td>
                      <td className="text-xs text-base-content/50 font-mono">
                        {p.numeroContenedor ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
