"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import {
  BarChart2, Users, Package, Download, TrendingUp,
  TrendingDown, Clock, ShoppingCart, FileText, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/utils/utilidades';

// ── Utilidad CSV ─────────────────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h];
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── KPI Cards ────────────────────────────────────────────────────────────────
function KPICards() {
  const { data, error, isLoading } = useSWR('/api/informes?tipo=kpis');

  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat bg-base-200 rounded-xl animate-pulse h-28" />
      ))}
    </div>
  );

  if (error) return <div role="alert" className="alert alert-error mb-8"><AlertCircle className="w-4 h-4" /><span>Error al cargar los KPIs</span></div>;
  if (!data) return null;

  const varMes = data.totalMesAnterior > 0
    ? ((data.totalMes - data.totalMesAnterior) / data.totalMesAnterior * 100).toFixed(1)
    : null;
  const subMes = varMes !== null
    ? `${varMes > 0 ? '+' : ''}${varMes}% vs mes anterior`
    : 'Sin datos mes anterior';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="stat bg-base-200 rounded-xl">
        <div className="stat-figure text-primary"><TrendingUp className="w-7 h-7" /></div>
        <div className="stat-title text-xs">Facturado este mes</div>
        <div className="stat-value text-lg">{formatCurrency(data.totalMes)}</div>
        <div className={`stat-desc flex items-center gap-1 ${varMes > 0 ? 'text-success' : varMes < 0 ? 'text-error' : ''}`}>
          {varMes > 0 ? <TrendingUp className="w-3 h-3" /> : varMes < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          {subMes}
        </div>
      </div>

      <div className="stat bg-base-200 rounded-xl">
        <div className="stat-figure text-warning"><Clock className="w-7 h-7" /></div>
        <div className="stat-title text-xs">Pedidos pendientes</div>
        <div className="stat-value text-lg">{data.pedidosPendientes}</div>
        <div className="stat-desc">{data.numPedidosMes} pedidos este mes</div>
      </div>

      <div className="stat bg-base-200 rounded-xl">
        <div className="stat-figure text-secondary"><ShoppingCart className="w-7 h-7" /></div>
        <div className="stat-title text-xs">Ticket medio</div>
        <div className="stat-value text-lg">{formatCurrency(data.ticketMedio)}</div>
        <div className="stat-desc">por pedido (histórico)</div>
      </div>

      <div className="stat bg-base-200 rounded-xl">
        <div className="stat-figure text-accent"><FileText className="w-7 h-7" /></div>
        <div className="stat-title text-xs">Tasa conversión</div>
        <div className="stat-value text-lg">{data.tasaConversion}%</div>
        <div className="stat-desc">presupuesto → pedido</div>
      </div>
    </div>
  );
}

// ── Ventas mensuales ─────────────────────────────────────────────────────────
function VentasMensuales() {
  const añoActual = new Date().getFullYear();
  const [año, setAño] = useState(añoActual);
  const [comparar, setComparar] = useState(false);

  const { data: resp, error, isLoading } = useSWR(
    `/api/informes?tipo=ventas-mensuales&año=${año}&comparar=${comparar}`
  );

  const chartData = useMemo(() => resp?.data ?? [], [resp]);
  const años = Array.from({ length: 5 }, (_, i) => añoActual - i);

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const chartDataLabeled = chartData.map(d => ({ ...d, mesLabel: MESES[parseInt(d.mes, 10) - 1] ?? d.mes }));

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg" /></div>;
  if (error) return <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar las ventas mensuales</span></div>;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">Ventas por Mes</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="select select-bordered select-sm"
            value={año}
            onChange={e => setAño(parseInt(e.target.value, 10))}
          >
            {años.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-sm" checked={comparar} onChange={e => setComparar(e.target.checked)} />
            Comparar con {año - 1}
          </label>
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(chartData, `ventas-${año}.csv`)} disabled={!chartData.length}>
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="h-72 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDataLabeled} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => formatCurrency(v)} />
            {comparar && <Legend />}
            <Bar dataKey="totalVentas" name={String(año)} fill="#570DF8" radius={[4, 4, 0, 0]} />
            {comparar && <Bar dataKey="totalVentasAnterior" name={String(año - 1)} fill="#D1D5DB" radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>Mes</th>
              <th className="text-right">Nº Pedidos</th>
              <th className="text-right">Total Ventas</th>
              {comparar && <th className="text-right text-gray-400">{año - 1}</th>}
            </tr>
          </thead>
          <tbody>
            {chartDataLabeled.map(row => (
              <tr key={row.mes} className="hover">
                <td className="font-mono">{row.mesLabel}</td>
                <td className="text-right">{row.numPedidos}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalVentas)}</td>
                {comparar && <td className="text-right text-gray-400">{formatCurrency(row.totalVentasAnterior ?? 0)}</td>}
              </tr>
            ))}
            {chartDataLabeled.length === 0 && (
              <tr><td colSpan={comparar ? 4 : 3} className="text-center text-gray-400 py-6">Sin datos para {año}</td></tr>
            )}
          </tbody>
          {chartDataLabeled.length > 0 && (
            <tfoot>
              <tr className="font-bold border-t-2">
                <td>TOTAL</td>
                <td className="text-right">{chartDataLabeled.reduce((s, r) => s + r.numPedidos, 0)}</td>
                <td className="text-right">{formatCurrency(chartDataLabeled.reduce((s, r) => s + r.totalVentas, 0))}</td>
                {comparar && <td className="text-right text-gray-400">{formatCurrency(chartDataLabeled.reduce((s, r) => s + (r.totalVentasAnterior ?? 0), 0))}</td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Top clientes ─────────────────────────────────────────────────────────────
function TopClientes() {
  const { data, error, isLoading } = useSWR('/api/informes?tipo=top-clientes');
  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg" /></div>;
  if (error) return <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar los clientes</span></div>;
  const top10 = data?.slice(0, 10) ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Top Clientes por Facturación</h2>
        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data, 'top-clientes.csv')} disabled={!data?.length}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>
      <div className="h-72 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={95} />
            <Tooltip formatter={v => formatCurrency(v)} />
            <Bar dataKey="totalFacturado" name="Total facturado" fill="#36D399" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead><tr><th>#</th><th>Cliente</th><th className="text-right">Pedidos</th><th className="text-right">Total Facturado</th></tr></thead>
          <tbody>
            {(data ?? []).map((row, i) => (
              <tr key={row.clienteId} className="hover">
                <td className="text-gray-400 text-sm">{i + 1}</td>
                <td className="font-medium">
                  <Link href={`/gestion/clientes/${row.clienteId}`} className="link link-hover">{row.nombre}</Link>
                </td>
                <td className="text-right">{row.numPedidos}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalFacturado)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={4} className="text-center text-gray-400 py-6">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ventas por producto ──────────────────────────────────────────────────────
function VentasPorProducto() {
  const { data, error, isLoading } = useSWR('/api/informes?tipo=ventas-por-producto');
  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg" /></div>;
  if (error) return <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar las ventas por producto</span></div>;
  const top10 = data?.slice(0, 10) ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Ventas por Producto (Top 50)</h2>
        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data, 'ventas-por-producto.csv')} disabled={!data?.length}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {top10.length > 0 && (
        <div className="h-72 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 160, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="descripcion" tick={{ fontSize: 10 }} width={155} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="totalVentas" name="Total ventas" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead><tr><th>#</th><th>Descripción</th><th className="text-right">Cantidad</th><th className="text-right">Total Ventas</th></tr></thead>
          <tbody>
            {(data ?? []).map((row, i) => (
              <tr key={i} className="hover">
                <td className="text-gray-400 text-sm">{i + 1}</td>
                <td className="text-sm">{row.descripcion}</td>
                <td className="text-right">{row.cantidadTotal}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalVentas)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && <tr><td colSpan={4} className="text-center text-gray-400 py-6">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Presupuestos sin respuesta ───────────────────────────────────────────────
function PresupuestosSinRespuesta() {
  const [dias, setDias] = useState(14);
  const { data, error, isLoading } = useSWR(`/api/informes?tipo=presupuestos-sin-respuesta&dias=${dias}`);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-warning" /> Presupuestos sin respuesta
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Enviados hace más de</span>
          <select className="select select-bordered select-sm" value={dias} onChange={e => setDias(parseInt(e.target.value, 10))}>
            {[7, 14, 21, 30, 60].map(d => <option key={d} value={d}>{d} días</option>)}
          </select>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg" /></div>}
      {error && <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar los presupuestos</span></div>}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th className="text-right">Total</th>
                <th className="text-right">Días en espera</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map(p => (
                <tr key={p.id} className="hover">
                  <td><Link href={`/presupuestos/${p.id}`} className="link link-primary font-mono text-sm">{p.numero}</Link></td>
                  <td>{p.cliente?.nombre ?? '—'}</td>
                  <td className="text-right font-semibold">{formatCurrency(p.total)}</td>
                  <td className="text-right">
                    <span className={`badge badge-sm ${p.diasEspera > 30 ? 'badge-error' : p.diasEspera > 14 ? 'badge-warning' : 'badge-ghost'}`}>
                      {p.diasEspera}d
                    </span>
                  </td>
                  <td>
                    <Link href={`/presupuestos/${p.id}`} className="btn btn-xs btn-outline">Ver</Link>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin presupuestos pendientes de respuesta — ¡bien hecho!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'mensuales', label: 'Ventas por Mes', icon: BarChart2, component: VentasMensuales },
  { id: 'clientes', label: 'Top Clientes', icon: Users, component: TopClientes },
  { id: 'productos', label: 'Por Producto', icon: Package, component: VentasPorProducto },
  { id: 'seguimiento', label: 'Sin Respuesta', icon: AlertCircle, component: PresupuestosSinRespuesta },
];

export default function InformesPage() {
  const [activeTab, setActiveTab] = useState('mensuales');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? VentasMensuales;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <BarChart2 className="w-7 h-7" /> Informes
      </h1>

      <KPICards />

      <div role="tablist" className="tabs tabs-bordered mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            className={`tab gap-2 ${activeTab === tab.id ? 'tab-active font-semibold' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-base-100 shadow-xl rounded-xl p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
