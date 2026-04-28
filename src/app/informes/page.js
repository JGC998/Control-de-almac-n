"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart2, Users, Package, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';

function exportCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    const v = row[h];
    return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function VentasMensuales() {
  const { data, isLoading } = useSWR('/api/informes?tipo=ventas-mensuales');

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map(d => ({ ...d, totalVentas: parseFloat(d.totalVentas.toFixed(2)) }));
  }, [data]);

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg"></span></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Ventas por Mes</h2>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => exportCSV(data, 'ventas-mensuales.csv')}
          disabled={!data?.length}
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="h-72 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => formatCurrency(v)} labelFormatter={l => `Mes: ${l}`} />
            <Bar dataKey="totalVentas" name="Total ventas" fill="#570DF8" radius={[4, 4, 0, 0]} />
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
            </tr>
          </thead>
          <tbody>
            {chartData.map(row => (
              <tr key={row.mes} className="hover">
                <td className="font-mono">{row.mes}</td>
                <td className="text-right">{row.numPedidos}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalVentas)}</td>
              </tr>
            ))}
            {chartData.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6">No hay datos</td></tr>
            )}
          </tbody>
          {chartData.length > 0 && (
            <tfoot>
              <tr className="font-bold border-t-2">
                <td>TOTAL</td>
                <td className="text-right">{chartData.reduce((s, r) => s + r.numPedidos, 0)}</td>
                <td className="text-right">{formatCurrency(chartData.reduce((s, r) => s + r.totalVentas, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function TopClientes() {
  const { data, isLoading } = useSWR('/api/informes?tipo=top-clientes');

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg"></span></div>;

  const top10 = data?.slice(0, 10) ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Top Clientes por Facturación</h2>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => exportCSV(data, 'top-clientes.csv')}
          disabled={!data?.length}
        >
          <Download className="w-4 h-4" /> Exportar CSV
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
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th className="text-right">Nº Pedidos</th>
              <th className="text-right">Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row, i) => (
              <tr key={row.clienteId} className="hover">
                <td className="text-gray-400 text-sm">{i + 1}</td>
                <td className="font-medium">{row.nombre}</td>
                <td className="text-right">{row.numPedidos}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalFacturado)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={4} className="text-center text-gray-400 py-6">No hay datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VentasPorProducto() {
  const { data, isLoading } = useSWR('/api/informes?tipo=ventas-por-producto');

  if (isLoading) return <div className="flex justify-center py-20"><span className="loading loading-dots loading-lg"></span></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Ventas por Producto (Top 50)</h2>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => exportCSV(data, 'ventas-por-producto.csv')}
          disabled={!data?.length}
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th className="text-right">Cantidad Total</th>
              <th className="text-right">Total Ventas</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row, i) => (
              <tr key={i} className="hover">
                <td className="text-gray-400 text-sm">{i + 1}</td>
                <td className="text-sm">{row.descripcion}</td>
                <td className="text-right">{row.cantidadTotal}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalVentas)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr><td colSpan={4} className="text-center text-gray-400 py-6">No hay datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'mensuales', label: 'Ventas por Mes', icon: BarChart2, component: VentasMensuales },
  { id: 'clientes', label: 'Top Clientes', icon: Users, component: TopClientes },
  { id: 'productos', label: 'Por Producto', icon: Package, component: VentasPorProducto },
];

export default function InformesPage() {
  const [activeTab, setActiveTab] = useState('mensuales');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? VentasMensuales;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <BarChart2 className="w-7 h-7" /> Informes
      </h1>

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
