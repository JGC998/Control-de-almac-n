"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Receipt, Clipboard, Search, Plus, AlertTriangle, FileText, Trash2 } from 'lucide-react';

// ── Modo manual ───────────────────────────────────────────────────────────────
function FacturaManualForm() {
  const router = useRouter();
  const [clienteId, setClienteId]           = useState('');
  const [fechaVencimiento, setFechaVenc]    = useState('');
  const [notas, setNotas]                   = useState('');
  const [items, setItems]                   = useState([{ descripcion: '', quantity: 1, unitPrice: 0 }]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [clienteQuery, setClienteQuery]     = useState('');
  const [showClientes, setShowClientes]     = useState(false);

  const { data: config } = useSWR('/api/config');
  const ivaRate = config?.iva_rate || 0.21;

  const { data: clientesResult } = useSWR('/api/clientes?limit=500', null, { revalidateOnFocus: false });
  const todosClientes = clientesResult?.data || clientesResult || [];
  const clientesFiltrados = todosClientes.filter(c =>
    !clienteQuery || c.nombre.toLowerCase().includes(clienteQuery.toLowerCase())
  );
  const clienteSeleccionado = todosClientes.find(c => c.id === clienteId);

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function addItem() {
    setItems(prev => [...prev, { descripcion: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const tax      = subtotal * ivaRate;
  const total    = subtotal + tax;

  async function handleSubmit(e) {
    e.preventDefault();
    const validos = items.filter(i => i.descripcion.trim());
    if (!validos.length) { setError('Añade al menos una línea con descripción'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId:       clienteId || undefined,
          fechaVencimiento: fechaVencimiento || undefined,
          notas:           notas || undefined,
          items: validos.map(i => ({
            descripcion: i.descripcion.trim(),
            quantity:    Number(i.quantity) || 1,
            unitPrice:   Number(i.unitPrice) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear factura');
      router.push(`/facturas/${data.id}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="alert alert-error text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Cliente */}
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Cliente (opcional)</span></label>
        <div className="relative">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Buscar cliente…"
            value={clienteSeleccionado ? clienteSeleccionado.nombre : clienteQuery}
            onChange={e => { setClienteQuery(e.target.value); setClienteId(''); setShowClientes(true); }}
            onFocus={() => setShowClientes(true)}
          />
          {showClientes && clienteQuery && clientesFiltrados.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {clientesFiltrados.slice(0, 15).map(c => (
                <button key={c.id} type="button"
                  className="w-full text-left px-4 py-2 hover:bg-base-200 text-sm"
                  onClick={() => { setClienteId(c.id); setClienteQuery(''); setShowClientes(false); }}>
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        {clienteSeleccionado && (
          <label className="label">
            <span className="label-text-alt text-success">✓ {clienteSeleccionado.nombre}</span>
            <button type="button" className="label-text-alt text-error text-xs"
              onClick={() => { setClienteId(''); setClienteQuery(''); }}>Quitar</button>
          </label>
        )}
      </div>

      {/* Fecha vencimiento */}
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Fecha de vencimiento (opcional)</span></label>
        <input type="date" className="input input-bordered"
          value={fechaVencimiento} onChange={e => setFechaVenc(e.target.value)} />
      </div>

      {/* Líneas */}
      <div>
        <label className="label"><span className="label-text font-medium">Líneas de factura</span></label>
        <div className="space-y-2">
          {items.map((item, idx) => {
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            return (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder="Descripción"
                  value={item.descripcion}
                  onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                />
                <input type="number" min="1" step="1"
                  className="input input-bordered input-sm w-20 text-center"
                  placeholder="Cant."
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                />
                <input type="number" min="0" step="0.01"
                  className="input input-bordered input-sm w-28 text-right"
                  placeholder="P. Unit."
                  value={item.unitPrice}
                  onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                />
                <span className="text-sm font-semibold w-20 text-right shrink-0">
                  {lineTotal.toFixed(2)} €
                </span>
                <button type="button" onClick={() => removeItem(idx)}
                  className="btn btn-ghost btn-xs text-error px-1 shrink-0"
                  disabled={items.length === 1}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addItem}
          className="btn btn-ghost btn-sm gap-1 text-primary mt-2">
          <Plus className="w-4 h-4" /> Añadir línea
        </button>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="border border-base-300 rounded-lg p-4 min-w-52 space-y-2 text-sm bg-base-200">
          <div className="flex justify-between gap-8">
            <span className="text-base-content/60">Base imponible</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-base-content/60">IVA ({(ivaRate * 100).toFixed(0)}%)</span>
            <span>{tax.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between gap-8 pt-2 border-t border-base-300 font-bold text-base">
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="form-control">
        <label className="label"><span className="label-text font-medium">Notas (opcional)</span></label>
        <textarea className="textarea textarea-bordered" rows={2}
          placeholder="Notas internas o para el cliente…"
          value={notas} onChange={e => setNotas(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/facturas" className="btn btn-ghost">Cancelar</Link>
        <button type="submit" disabled={loading} className="btn btn-primary gap-1">
          {loading ? <span className="loading loading-spinner loading-xs" /> : <Receipt className="w-4 h-4" />}
          Crear factura borrador
        </button>
      </div>
    </form>
  );
}

// ── Modo desde albarán ─────────────────────────────────────────────────────────
function DesdeAlbaranForm() {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const { data: albResult } = useSWR('/api/albaranes?estado=EMITIDO&limit=500', null, { revalidateOnFocus: false });
  const albaranes = (albResult?.data || []).filter(a => {
    if (!['EMITIDO', 'ENTREGADO'].includes(a.estado)) return false;
    if (a.factura) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return a.numero?.toLowerCase().includes(q) || a.cliente?.nombre?.toLowerCase().includes(q);
  });

  async function generarDesde(albaran) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/albaranes/${albaran.id}/factura`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al generar factura');
      router.push(`/facturas/${data.id}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <label className="input input-bordered flex items-center gap-2">
        <Search className="w-4 h-4 opacity-40" />
        <input type="text" className="grow"
          placeholder="Buscar por número de albarán o cliente…"
          value={query} onChange={e => setQuery(e.target.value)} />
      </label>

      <div className="space-y-2">
        {albaranes.length === 0 && (
          <p className="text-center text-base-content/40 py-10">
            No hay albaranes disponibles para facturar{query ? ` para "${query}"` : ''}
          </p>
        )}
        {albaranes.map(albaran => (
          <div key={albaran.id}
            className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors">
            <div className="card-body p-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clipboard className="w-5 h-5 text-base-content/40 shrink-0" />
                <div>
                  <p className="font-mono font-semibold">{albaran.numero}</p>
                  <p className="text-sm text-base-content/60">
                    {albaran.cliente?.nombre ?? 'Sin cliente'} ·{' '}
                    {new Date(albaran.fechaCreacion).toLocaleDateString('es-ES')} ·{' '}
                    {albaran.total?.toFixed(2)} €
                    {' · '}
                    <span className={`badge badge-xs ${
                      albaran.estado === 'ENTREGADO' ? 'badge-success' :
                      albaran.estado === 'EMITIDO'   ? 'badge-info'    : 'badge-ghost'
                    }`}>
                      {albaran.estado.charAt(0) + albaran.estado.slice(1).toLowerCase()}
                    </span>
                  </p>
                </div>
              </div>
              <button onClick={() => generarDesde(albaran)} disabled={loading}
                className="btn btn-primary btn-sm gap-1 shrink-0">
                <Plus className="w-4 h-4" /> Generar factura
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NuevaFacturaPage() {
  const [modo, setModo] = useState('albaran'); // 'albaran' | 'manual'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/facturas" className="btn btn-ghost btn-xs gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Facturas
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Nueva factura
        </h1>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered">
        <button
          className={`tab gap-2 ${modo === 'albaran' ? 'tab-active' : ''}`}
          onClick={() => setModo('albaran')}>
          <Clipboard className="w-4 h-4" /> Desde albarán
        </button>
        <button
          className={`tab gap-2 ${modo === 'manual' ? 'tab-active' : ''}`}
          onClick={() => setModo('manual')}>
          <FileText className="w-4 h-4" /> Factura manual
        </button>
      </div>

      {modo === 'albaran' ? <DesdeAlbaranForm /> : <FacturaManualForm />}
    </div>
  );
}
