'use client';
import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  FileText, Search, Trash2, Plus, Copy, Send, Save,
  CheckCircle2, AlertCircle, ChevronDown, X, ArrowLeft,
} from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import ModalBusquedaProductos from '@/componentes/modales/ModalBusquedaProductos';
import { generarCodigo } from '@/lib/producto-utils';

// ──────────────────────────── helpers ────────────────────────────
const fmtE = (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function calcPrecioVenta(basePrice, margen, totalQty) {
  if (!basePrice) return 0;
  if (!margen) return basePrice;
  const mult      = Number(margen.multiplicador) || 1;
  const gastoFijo = Number(margen.gastoFijo)     || 0;
  const gfPorU    = totalQty > 0 ? gastoFijo / totalQty : 0;
  return basePrice * mult + gfPorU;
}

function formatearMensaje(cliente, lineas, subtotal, iva, total, ivaRate) {
  const pct = Math.round((ivaRate || 0.21) * 100);
  const cabecera = cliente ? `Cliente: ${cliente}\n` : '';
  const lineasTxt = lineas.map(l =>
    `• ${l.qty}x ${l.nombre}  →  ${fmtE(l.precioVenta)} /ud = ${fmtE(l.precioVenta * l.qty)}`
  ).join('\n');
  return (
`🧾 PRESUPUESTO RÁPIDO
${cabecera}` +
`─────────────────────
${lineasTxt}
─────────────────────
Subtotal: ${fmtE(subtotal)}
IVA (${pct}%): ${fmtE(iva)}
*TOTAL: ${fmtE(total)}*`
  );
}

// ─────────────────────────── component ───────────────────────────
export default function PresupuestoRapidoPage() {
  const { data: productos = [] } = useSWR('/api/productos', fetcher);
  const { data: margenes  = [] } = useSWR('/api/pricing/margenes', fetcher);
  const { data: config }         = useSWR('/api/config', fetcher);

  const ivaRate = config?.iva_rate > 1 ? config.iva_rate / 100 : (config?.iva_rate || 0.21);

  const [cliente,      setCliente]      = useState('');
  const [lineas,       setLineas]       = useState([]);   // { id, productoId, nombre, basePrice, precioVenta, qty }
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [status, setStatus] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const margenSeleccionado = useMemo(
    () => margenes.find(m => String(m.id) === String(selectedMarginId)) || null,
    [margenes, selectedMarginId],
  );

  // Recalcular precios cuando cambia el margen
  const totalQty = lineas.reduce((s, l) => s + l.qty, 0);

  const lineasCalculadas = useMemo(() =>
    lineas.map(l => ({
      ...l,
      precioVenta: calcPrecioVenta(l.basePrice, margenSeleccionado, totalQty),
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [lineas, margenSeleccionado, totalQty]);

  const subtotal = lineasCalculadas.reduce((s, l) => s + l.precioVenta * l.qty, 0);
  const iva      = subtotal * ivaRate;
  const total    = subtotal + iva;

  const mensaje = useMemo(
    () => formatearMensaje(cliente, lineasCalculadas, subtotal, iva, total, ivaRate),
    [cliente, lineasCalculadas, subtotal, iva, total, ivaRate],
  );

  // ── handlers ──
  const handleSelectProducto = useCallback((producto) => {
    setModalAbierto(false);
    const existe = lineas.find(l => l.productoId === producto.id);
    if (existe) {
      setLineas(prev => prev.map(l => l.productoId === producto.id ? { ...l, qty: l.qty + 1 } : l));
      return;
    }
    setLineas(prev => [...prev, {
      id:         Date.now(),
      productoId: producto.id,
      nombre:     producto.nombre || generarCodigo(producto),
      basePrice:  parseFloat(producto.precioUnitario) || 0,
      precioVenta: parseFloat(producto.precioUnitario) || 0,
      qty:        1,
    }]);
  }, [lineas]);

  const handleQty = (id, val) => {
    const n = Math.max(1, parseInt(val, 10) || 1);
    setLineas(prev => prev.map(l => l.id === id ? { ...l, qty: n } : l));
  };

  const handleEliminar = (id) => setLineas(prev => prev.filter(l => l.id !== id));

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setStatus({ type: 'success', text: 'Texto copiado al portapapeles.' });
    } catch {
      setStatus({ type: 'error', text: 'No se pudo copiar. Inténtalo de nuevo.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleEnviar = async () => {
    if (!lineas.length) { setStatus({ type: 'error', text: 'Añade al menos un producto.' }); return; }
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/herramientas/whatsapp-presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: 'error', text: data.error || 'Error al enviar WhatsApp.' });
      } else {
        setStatus({ type: 'success', text: '✅ Presupuesto enviado por WhatsApp.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSending(false);
    }
  };

  const handleGuardar = async () => {
    if (!lineas.length) { setStatus({ type: 'error', text: 'Añade al menos un producto.' }); return; }
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        notas:    cliente || undefined,
        marginId: selectedMarginId ? Number(selectedMarginId) : undefined,
        estado:   'Borrador',
        items: lineasCalculadas.map(l => ({
          descripcion: l.nombre,
          quantity:    l.qty,
          unitPrice:   l.precioVenta,
          productoId:  l.productoId,
        })),
      };
      const res  = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Error al guardar');
      setStatus({ type: 'success', text: `Guardado como presupuesto ${data.numero || ''}.` });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round(ivaRate * 100);

  return (
    <>
      <div className="min-h-screen bg-base-200">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-32 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/ventas" className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-6 h-6 text-success" />
              <h1 className="text-xl font-bold leading-tight">Presupuesto rápido</h1>
            </div>
          </div>

          {/* Cliente */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4">
              <input
                type="text"
                className="input input-ghost w-full text-base font-medium placeholder:text-base-content/30 focus:outline-none px-0"
                placeholder="Nombre del cliente (opcional)"
                value={cliente}
                onChange={e => setCliente(e.target.value)}
              />
            </div>
          </div>

          {/* Margen */}
          {margenes.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4">
                <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide block mb-1">
                  Margen de precio
                </label>
                <div className="relative">
                  <select
                    className="select select-ghost w-full text-sm font-medium pl-0 pr-8 focus:outline-none appearance-none bg-transparent"
                    value={selectedMarginId}
                    onChange={e => setSelectedMarginId(e.target.value)}
                  >
                    <option value="">Sin margen (precio base)</option>
                    {margenes.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.descripcion} — ×{Number(m.multiplicador).toFixed(2)}
                        {m.gastoFijo > 0 ? ` +${fmtE(m.gastoFijo)} fijo` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-base-content/40" />
                </div>
              </div>
            </div>
          )}

          {/* Líneas de producto */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Productos</span>
                <button
                  onClick={() => setModalAbierto(true)}
                  className="btn btn-success btn-sm gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>

              {lineasCalculadas.length === 0 && (
                <button
                  onClick={() => setModalAbierto(true)}
                  className="w-full border-2 border-dashed border-base-300 rounded-xl py-8 flex flex-col items-center gap-2 text-base-content/40 hover:border-success hover:text-success transition-colors"
                >
                  <Search className="w-8 h-8" />
                  <span className="text-sm">Toca para buscar un producto</span>
                </button>
              )}

              {lineasCalculadas.map(l => (
                <div key={l.id} className="flex items-center gap-3 bg-base-200 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{l.nombre}</p>
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {fmtE(l.precioVenta)} /ud
                      {margenSeleccionado && l.basePrice > 0 && (
                        <span className="ml-1.5 opacity-60">
                          (base {fmtE(l.basePrice)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={e => handleQty(l.id, e.target.value)}
                      className="input input-bordered input-sm w-16 text-center font-mono"
                    />
                    <button onClick={() => handleEliminar(l.id)} className="btn btn-ghost btn-sm btn-square text-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          {lineasCalculadas.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Subtotal</span>
                  <span className="font-mono">{fmtE(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">IVA ({pct}%)</span>
                  <span className="font-mono">{fmtE(iva)}</span>
                </div>
                <div className="divider my-0" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="font-mono text-success">{fmtE(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          {status && (
            <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'} py-2`}>
              {status.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="text-sm flex-1">{status.text}</span>
              <button onClick={() => setStatus(null)} className="btn btn-ghost btn-xs btn-square">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Barra de acciones flotante */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 px-4 z-30" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', paddingTop: '0.75rem' }}>
          <div className="max-w-lg mx-auto flex gap-2">
            <button
              onClick={handleCopiar}
              disabled={!lineas.length}
              className="btn btn-outline flex-1 gap-1.5 btn-sm sm:btn-md"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <button
              onClick={handleEnviar}
              disabled={!lineas.length || sending}
              className="btn btn-success flex-1 gap-1.5 btn-sm sm:btn-md"
            >
              {sending
                ? <span className="loading loading-spinner loading-xs" />
                : <Send className="w-4 h-4" />}
              Enviar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!lineas.length || saving}
              className="btn btn-primary flex-1 gap-1.5 btn-sm sm:btn-md"
            >
              {saving
                ? <span className="loading loading-spinner loading-xs" />
                : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </div>

      <ModalBusquedaProductos
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        alSeleccionar={handleSelectProducto}
        items={productos}
      />
    </>
  );
}
