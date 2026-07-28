"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line,
} from 'recharts';
import {
  BarChart2, Users, Package, Download, TrendingUp,
  TrendingDown, Clock, ShoppingCart, FileText, AlertCircle, Printer,
  DollarSign, Package2, AlertTriangle,
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

  const varMesNum = data.totalMesAnterior > 0
    ? ((data.totalMes - data.totalMesAnterior) / data.totalMesAnterior * 100)
    : null;
  const varMes = varMesNum !== null
    ? varMesNum.toLocaleString('es-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})
    : null;
  const subMes = varMes !== null
    ? `${varMesNum > 0 ? '+' : ''}${varMes}% vs mes anterior`
    : 'Sin datos mes anterior';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="stat bg-base-200 rounded-xl">
        <div className="stat-figure text-primary"><TrendingUp className="w-7 h-7" /></div>
        <div className="stat-title text-xs">Facturado este mes</div>
        <div className="stat-value text-lg">{formatCurrency(data.totalMes)}</div>
        <div className={`stat-desc flex items-center gap-1 ${varMesNum > 0 ? 'text-success' : varMesNum < 0 ? 'text-error' : ''}`}>
          {varMesNum > 0 ? <TrendingUp className="w-3 h-3" /> : varMesNum < 0 ? <TrendingDown className="w-3 h-3" /> : null}
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
            <YAxis tickFormatter={v => `${(v / 1000).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}k€`} tick={{ fontSize: 12 }} />
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
            <XAxis type="number" tickFormatter={v => `${(v / 1000).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}k€`} tick={{ fontSize: 12 }} />
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
        <h2 className="text-lg font-bold">Volumen por producto — venta estimada sin IVA (Top 50)</h2>
        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data, 'ventas-por-producto.csv')} disabled={!data?.length}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {top10.length > 0 && (
        <div className="h-72 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 160, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}k€`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="descripcion" tick={{ fontSize: 10 }} width={155} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="totalVentaEstimada" name="Venta estimada s/IVA (€)" fill="#36D399" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th className="text-right">Cantidad</th>
              <th className="text-right" title="Venta estimada = proporción del coste del ítem × total sin IVA del pedido">Venta estimada (s/IVA)</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row, i) => (
              <tr key={i} className="hover">
                <td className="text-gray-400 text-sm">{i + 1}</td>
                <td className="text-sm">{row.descripcion}</td>
                <td className="text-right">{row.cantidadTotal}</td>
                <td className="text-right font-semibold">{formatCurrency(row.totalVentaEstimada)}</td>
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

// ── Ventas por cliente específico ────────────────────────────────────────────
function VentasPorCliente() {
  const [clienteId, setClienteId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: clientes } = useSWR('/api/clientes');

  const params = new URLSearchParams({ tipo: 'ventas-por-cliente' });
  if (clienteId) params.set('clienteId', clienteId);
  if (desde)     params.set('desde', desde);
  if (hasta)     params.set('hasta', hasta);

  const hayFiltro = clienteId || desde || hasta;
  const { data, error, isLoading } = useSWR(hayFiltro ? `/api/informes?${params}` : null);

  const imprimirPDF = () => window.print();

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">Ventas por Cliente</h2>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data?.pedidos, 'ventas-cliente.csv')} disabled={!data?.pedidos?.length}>
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className="btn btn-sm btn-outline" onClick={imprimirPDF} disabled={!data?.pedidos?.length}>
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-base-200 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="label py-1"><span className="label-text text-xs">Cliente</span></label>
          <select className="select select-bordered select-sm w-full" value={clienteId} onChange={e => setClienteId(e.target.value)}>
            <option value="">Todos los clientes</option>
            {(clientes ?? []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label py-1"><span className="label-text text-xs">Desde</span></label>
          <input type="date" className="input input-bordered input-sm" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="label py-1"><span className="label-text text-xs">Hasta</span></label>
          <input type="date" className="input input-bordered input-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {(clienteId || desde || hasta) && (
          <div className="flex items-end">
            <button className="btn btn-ghost btn-sm" onClick={() => { setClienteId(''); setDesde(''); setHasta(''); }}>
              Limpiar
            </button>
          </div>
        )}
      </div>

      {!hayFiltro && (
        <p className="text-center text-base-content/40 py-12">Selecciona un cliente o un rango de fechas para ver los datos.</p>
      )}

      {isLoading && <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg" /></div>}
      {error && <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar los datos</span></div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stat bg-base-200 rounded-xl">
              <div className="stat-title text-xs">Pedidos</div>
              <div className="stat-value text-lg">{data.count}</div>
            </div>
            <div className="stat bg-base-200 rounded-xl">
              <div className="stat-title text-xs">Total facturado</div>
              <div className="stat-value text-lg">{formatCurrency(data.totalFacturado)}</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {data.pedidos.map(p => (
                  <tr key={p.id} className="hover">
                    <td><Link href={`/pedidos/${p.id}`} className="link link-primary font-mono text-sm">{p.numero}</Link></td>
                    <td>{p.cliente}</td>
                    <td className="text-sm">{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                    <td><span className="badge badge-sm badge-ghost">{p.estado}</span></td>
                    <td className="text-right font-semibold">{formatCurrency(p.total)}</td>
                  </tr>
                ))}
                {data.pedidos.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">Sin pedidos para el filtro seleccionado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Margen real por pedido (T-39) ────────────────────────────────────────────
function MargenPedidos() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const params = new URLSearchParams({ tipo: 'margen-pedidos' });
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const { data, error, isLoading } = useSWR(`/api/informes?${params}`);

  const resumen = useMemo(() => {
    if (!data?.length) return null;
    const totalVenta = data.reduce((s, p) => s + p.totalVenta, 0);
    const totalCoste = data.reduce((s, p) => s + p.totalCoste, 0);
    const margen = totalVenta - totalCoste;
    return {
      totalVenta: parseFloat(totalVenta.toFixed(2)),
      totalCoste: parseFloat(totalCoste.toFixed(2)),
      margen: parseFloat(margen.toFixed(2)),
      pctMargen: totalVenta > 0 ? parseFloat((margen / totalVenta * 100).toFixed(1)) : 0,
      numPedidos: data.length,
    };
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-success" /> Margen real por pedido
        </h2>
        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data, 'margen-pedidos.csv')} disabled={!data?.length}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 p-3 bg-base-200 rounded-lg">
        <div>
          <label className="label py-1"><span className="label-text text-xs">Desde</span></label>
          <input type="date" className="input input-bordered input-sm" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="label py-1"><span className="label-text text-xs">Hasta</span></label>
          <input type="date" className="input input-bordered input-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {(desde || hasta) && (
          <div className="flex items-end">
            <button className="btn btn-ghost btn-sm" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar</button>
          </div>
        )}
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="stat bg-base-200 rounded-xl py-3">
            <div className="stat-title text-xs">Pedidos analizados</div>
            <div className="stat-value text-lg">{resumen.numPedidos}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl py-3">
            <div className="stat-title text-xs">Total venta (sin IVA)</div>
            <div className="stat-value text-lg">{formatCurrency(resumen.totalVenta)}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl py-3">
            <div className="stat-title text-xs">Total coste</div>
            <div className="stat-value text-lg text-warning">{formatCurrency(resumen.totalCoste)}</div>
          </div>
          <div className="stat bg-success text-success-content rounded-xl py-3">
            <div className="stat-title text-xs opacity-80">Margen bruto</div>
            <div className="stat-value text-lg">{formatCurrency(resumen.margen)}</div>
            <div className="stat-desc opacity-80">{resumen.pctMargen}% sobre venta</div>
          </div>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg" /></div>}
      {error && <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar los datos</span></div>}

      {data && (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th className="text-right">Coste</th>
                <th className="text-right">Venta (s/IVA)</th>
                <th className="text-right text-success">Margen €</th>
                <th className="text-right text-success">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr key={p.id} className="hover">
                  <td><Link href={`/pedidos/${p.id}`} className="link link-primary font-mono text-sm">{p.numero}</Link></td>
                  <td className="text-sm">
                    {p.clienteId
                      ? <Link href={`/gestion/clientes/${p.clienteId}`} className="link link-hover">{p.clienteNombre}</Link>
                      : p.clienteNombre}
                  </td>
                  <td className="text-sm text-base-content/50">{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                  <td className="text-right font-mono text-sm">{formatCurrency(p.totalCoste)}</td>
                  <td className="text-right font-mono text-sm">{formatCurrency(p.totalVenta)}</td>
                  <td className={`text-right font-mono font-bold ${p.margen >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(p.margen)}
                  </td>
                  <td className="text-right">
                    <span className={`badge badge-sm ${p.pctMargen >= 20 ? 'badge-success' : p.pctMargen >= 10 ? 'badge-warning' : 'badge-error'}`}>
                      {p.pctMargen}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Sin pedidos para mostrar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rentabilidad por cliente (T-40) ──────────────────────────────────────────
function RentabilidadClientes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const params = new URLSearchParams({ tipo: 'rentabilidad-clientes' });
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const { data, error, isLoading } = useSWR(`/api/informes?${params}`);
  const top10 = data?.slice(0, 10) ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" /> Rentabilidad por cliente
        </h2>
        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data, 'rentabilidad-clientes.csv')} disabled={!data?.length}>
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      <p className="text-sm text-base-content/50 mb-4">
        Margen = (Total venta sin IVA) − (Suma de costes unitarios de los ítems). Ordenado de más a menos rentable.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 p-3 bg-base-200 rounded-lg">
        <div>
          <label className="label py-1"><span className="label-text text-xs">Desde</span></label>
          <input type="date" className="input input-bordered input-sm" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="label py-1"><span className="label-text text-xs">Hasta</span></label>
          <input type="date" className="input input-bordered input-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {(desde || hasta) && (
          <div className="flex items-end">
            <button className="btn btn-ghost btn-sm" onClick={() => { setDesde(''); setHasta(''); }}>Limpiar</button>
          </div>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg" /></div>}
      {error && <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar los datos</span></div>}

      {top10.length > 0 && (
        <div className="h-64 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 20, left: 130, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}k€`} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={125} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="totalFacturado" name="Venta s/IVA" fill="#36D399" radius={[0, 4, 4, 0]} />
              <Bar dataKey="margen" name="Margen €" fill="#570DF8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && (
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Venta s/IVA</th>
                <th className="text-right">Coste</th>
                <th className="text-right text-success">Margen €</th>
                <th className="text-right text-success">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c, i) => (
                <tr key={c.clienteId} className="hover">
                  <td className="text-base-content/40 text-sm">{i + 1}</td>
                  <td className="font-medium">
                    <Link href={`/gestion/clientes/${c.clienteId}`} className="link link-hover">{c.nombre}</Link>
                  </td>
                  <td className="text-right">{c.numPedidos}</td>
                  <td className="text-right font-mono">{formatCurrency(c.totalFacturado)}</td>
                  <td className="text-right font-mono text-base-content/60">{formatCurrency(c.totalCoste)}</td>
                  <td className={`text-right font-mono font-bold ${c.margen >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(c.margen)}
                  </td>
                  <td className="text-right">
                    <span className={`badge badge-sm ${c.pctMargen >= 20 ? 'badge-success' : c.pctMargen >= 10 ? 'badge-warning' : 'badge-error'}`}>
                      {c.pctMargen}%
                    </span>
                  </td>
                </tr>
              ))}
              {(!data || data.length === 0) && (
                <tr><td colSpan={7} className="text-center text-base-content/40 py-8">Sin datos de rentabilidad</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Histórico de precios de proveedor (T-41) ──────────────────────────────────
function HistoricoPrecios() {
  const { data, error, isLoading } = useSWR('/api/importaciones/historico-bobinas');
  const [refSeleccionada, setRefSeleccionada] = useState('');

  const detalle = refSeleccionada
    ? data?.find(r => r.referencia === refSeleccionada)
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Package2 className="w-5 h-5 text-warning" /> Histórico de precios por bobina
        </h2>
      </div>
      <p className="text-sm text-base-content/50 mb-4">
        Evolución del USD/M y del €/metro real (con prorrateo de gastos) de cada referencia de bobina importada.
        Requiere tener importaciones guardadas en la calculadora de contenedor.
      </p>

      {isLoading && <div className="flex justify-center py-12"><span className="loading loading-dots loading-lg" /></div>}
      {error && <div role="alert" className="alert alert-error"><AlertCircle className="w-4 h-4" /><span>Error al cargar el historial</span></div>}

      {data?.length === 0 && (
        <div className="text-center py-12 text-base-content/40">
          <Package2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No hay importaciones guardadas todavía.</p>
          <p className="text-sm mt-1">Guarda cálculos en la <Link href="/herramientas/calculadora-contenedor" className="link">calculadora de contenedor</Link> para ver la evolución.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de referencias */}
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-2">Referencias</p>
            <div className="space-y-1">
              {data.map(r => (
                <button
                  key={r.referencia}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${refSeleccionada === r.referencia ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
                  onClick={() => setRefSeleccionada(r.referencia === refSeleccionada ? '' : r.referencia)}
                >
                  <div className="font-medium truncate">{r.referencia}</div>
                  <div className={`text-xs flex items-center gap-1 ${refSeleccionada === r.referencia ? 'opacity-70' : 'text-base-content/50'}`}>
                    {r.numImportaciones} importac. ·{' '}
                    {r.variacionPct !== 0 && (
                      <span className={r.variacionPct > 0 ? 'text-error' : 'text-success'}>
                        {r.variacionPct > 0 ? '▲' : '▼'} {Math.abs(r.variacionPct)}%
                      </span>
                    )}
                    {r.variacionPct === 0 && 'sin variación'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detalle */}
          <div className="lg:col-span-2">
            {!refSeleccionada && (
              <div className="flex items-center justify-center h-48 text-base-content/30 text-sm">
                Selecciona una referencia para ver su evolución
              </div>
            )}

            {detalle && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{detalle.referencia}</h3>
                  <button className="btn btn-xs btn-outline" onClick={() => exportCSV(detalle.datos.map(d => ({
                    fecha: new Date(d.fecha).toLocaleDateString('es-ES'),
                    descripcion: d.importacionDesc || '',
                    usdPorMetro: d.usdPorMetro,
                    tasaCambio: d.tasaCambio,
                    costePorMetroEUR: d.costePorMetroEUR,
                    metros: d.totalMetros,
                  })), `precios-${detalle.referencia}.csv`)}>
                    <Download className="w-3 h-3" /> CSV
                  </button>
                </div>

                {detalle.datos.length >= 2 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={detalle.datos.map(d => ({
                        fecha: new Date(d.fecha).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                        'USD/M': d.usdPorMetro,
                        '€/M real': d.costePorMetroEUR,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="USD/M" stroke="#F59E0B" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="€/M real" stroke="#570DF8" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="table table-xs w-full">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Importación</th>
                        <th className="text-right">USD/M</th>
                        <th className="text-right">TC</th>
                        <th className="text-right text-success">€/M real</th>
                        <th className="text-right">Metros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.datos.map((d, i) => (
                        <tr key={i} className="hover">
                          <td className="font-mono text-xs">{new Date(d.fecha).toLocaleDateString('es-ES')}</td>
                          <td className="text-xs text-base-content/60 max-w-[140px] truncate">{d.importacionDesc || '—'}</td>
                          <td className="text-right font-mono">{d.usdPorMetro.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</td>
                          <td className="text-right font-mono text-xs text-base-content/50">{d.tasaCambio.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</td>
                          <td className="text-right font-mono font-bold text-success">{d.costePorMetroEUR.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})} €</td>
                          <td className="text-right font-mono text-xs">{d.totalMetros} m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Margen Real ──────────────────────────────────────────────────────────────
function MargenReal() {
  const currentYear = new Date().getFullYear();
  const [desde, setDesde] = useState(`${currentYear}-01-01`);
  const [hasta, setHasta] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos' | 'bajo'

  const params = new URLSearchParams({ tipo: 'margen-real' });
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const { data, isLoading } = useSWR(`/api/informes?${params}`);

  const pedidos = data?.pedidos ?? [];
  const reglas  = data?.reglasMargenes ?? [];

  const filtrados = filtro === 'bajo' ? pedidos.filter(p => p.bajoPrecio) : pedidos;

  const resumen = useMemo(() => {
    if (!filtrados.length) return null;
    const totalVenta = filtrados.reduce((s, p) => s + p.ventaSinIVA, 0);
    const totalCosto = filtrados.reduce((s, p) => s + p.costoReal, 0);
    const totalMargen = totalVenta - totalCosto;
    const bajoPrecioCount = pedidos.filter(p => p.bajoPrecio).length;
    return {
      totalVenta, totalCosto, totalMargen,
      pct: totalVenta > 0 ? (totalMargen / totalVenta * 100) : 0,
      bajoPrecioCount,
    };
  }, [filtrados, pedidos]);

  const exportar = () => {
    if (!filtrados.length) return;
    const rows = filtrados.map(p => ({
      Pedido: p.numero, Fecha: new Date(p.fecha).toLocaleDateString('es-ES'),
      Estado: p.estado, Cliente: p.clienteNombre,
      'Venta sin IVA': p.ventaSinIVA, 'Coste real': p.costoReal,
      'Margen €': p.margenReal, 'Margen %': p.pctMargenReal,
      'Bajo precio': p.bajoPrecio ? 'Sí' : 'No',
    }));
    const csv = [Object.keys(rows[0]).join(';'), ...rows.map(r => Object.values(r).join(';'))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'margen-real.csv'; a.click();
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="label text-xs">Desde</label>
          <input type="date" className="input input-bordered input-sm" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input type="date" className="input input-bordered input-sm" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-auto">
          <button
            className={`btn btn-sm ${filtro === 'bajo' ? 'btn-error' : 'btn-outline'}`}
            onClick={() => setFiltro(f => f === 'bajo' ? 'todos' : 'bajo')}
          >
            <AlertTriangle className="w-4 h-4" /> Solo bajo precio
          </button>
          <button className="btn btn-sm btn-outline" onClick={exportar} disabled={!filtrados.length}>
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Reglas referencia */}
      {reglas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {reglas.map(r => (
            <span key={r.id} className="badge badge-outline badge-sm">
              {r.base}: ×{r.multiplicador}{r.gastoFijo ? ` +${r.gastoFijo}€` : ''}
            </span>
          ))}
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>}

      {/* KPIs de resumen */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="stat bg-base-200 rounded-xl p-3">
            <div className="stat-title text-xs">Venta total (sin IVA)</div>
            <div className="stat-value text-base">{formatCurrency(resumen.totalVenta)}</div>
          </div>
          <div className="stat bg-base-200 rounded-xl p-3">
            <div className="stat-title text-xs">Coste real total</div>
            <div className="stat-value text-base">{formatCurrency(resumen.totalCosto)}</div>
          </div>
          <div className={`stat rounded-xl p-3 ${resumen.totalMargen >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
            <div className="stat-title text-xs">Margen real</div>
            <div className={`stat-value text-base ${resumen.totalMargen >= 0 ? 'text-success' : 'text-error'}`}>
              {formatCurrency(resumen.totalMargen)} ({resumen.pct.toFixed(1)}%)
            </div>
          </div>
          <div className={`stat rounded-xl p-3 ${resumen.bajoPrecioCount > 0 ? 'bg-warning/10' : 'bg-base-200'}`}>
            <div className="stat-title text-xs">Pedidos bajo precio</div>
            <div className={`stat-value text-base ${resumen.bajoPrecioCount > 0 ? 'text-warning' : ''}`}>
              {resumen.bajoPrecioCount}
            </div>
          </div>
        </div>
      )}

      {!isLoading && filtrados.length === 0 && (
        <p className="text-center text-base-content/40 py-8">No hay pedidos en el rango seleccionado.</p>
      )}

      {filtrados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Estado</th>
                <th className="text-right">Venta s/IVA</th>
                <th className="text-right">Coste real</th>
                <th className="text-right">Margen €</th>
                <th className="text-right">Margen %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className={`hover ${p.bajoPrecio ? 'bg-warning/5' : ''}`}>
                  <td className="font-mono font-semibold">{p.numero}</td>
                  <td className="text-xs">{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                  <td className="text-xs truncate max-w-[120px]">{p.clienteNombre}</td>
                  <td><span className="badge badge-ghost badge-sm">{p.estado}</span></td>
                  <td className="text-right font-mono">{formatCurrency(p.ventaSinIVA)}</td>
                  <td className="text-right font-mono">{formatCurrency(p.costoReal)}</td>
                  <td className={`text-right font-mono font-bold ${p.margenReal >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatCurrency(p.margenReal)}
                  </td>
                  <td className={`text-right font-mono text-xs ${p.pctMargenReal < 20 ? 'text-warning' : p.pctMargenReal >= 0 ? 'text-success' : 'text-error'}`}>
                    {p.pctMargenReal.toFixed(1)}%
                  </td>
                  <td>
                    {p.bajoPrecio && <AlertTriangle className="w-4 h-4 text-warning" title="Vendido por debajo del precio mínimo esperado" />}
                    {p.itemsConCosto < p.totalItems && (
                      <span className="text-xs text-base-content/30" title={`${p.totalItems - p.itemsConCosto} ítems sin costoUnitario`}>~</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'mensuales',    label: 'Ventas por Mes',    icon: BarChart2,    component: VentasMensuales },
  { id: 'clientes',    label: 'Top Clientes',       icon: Users,        component: TopClientes },
  { id: 'por-cliente', label: 'Por Cliente',        icon: FileText,     component: VentasPorCliente },
  { id: 'productos',   label: 'Por Producto',       icon: Package,      component: VentasPorProducto },
  { id: 'seguimiento', label: 'Sin Respuesta',      icon: AlertCircle,  component: PresupuestosSinRespuesta },
  { id: 'margen',      label: 'Margen por Pedido',  icon: DollarSign,   component: MargenPedidos },
  { id: 'rentabilidad',label: 'Rentabilidad',       icon: TrendingUp,   component: RentabilidadClientes },
  { id: 'precios-imp', label: 'Precios Importación',icon: Package2,     component: HistoricoPrecios },
  { id: 'margen-real', label: 'Margen Real',        icon: AlertTriangle,component: MargenReal },
];

export default function InformesPage() {
  const [activeTab, setActiveTab] = useState('mensuales');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? VentasMensuales;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="w-7 h-7" /> Informes
        </h1>
        <button className="btn btn-sm btn-outline print:hidden" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

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
