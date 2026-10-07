'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  FileText, Search, Trash2, Plus, Copy, Share2, Save, FilePlus,
  CheckCircle2, AlertCircle, ChevronDown, X, ArrowLeft, QrCode,
  RotateCcw, FileDown, Percent, StickyNote, ExternalLink, Clock,
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

function formatearMensaje(cliente, lineas, subtotalBruto, descuento, subtotal, iva, total, ivaRate, nota) {
  const pct      = Math.round((ivaRate || 0.21) * 100);
  const cabecera = cliente ? `Cliente: ${cliente}\n` : '';
  const lineasTxt = lineas.map(l =>
    `• ${l.qty}x ${l.nombre}  →  ${fmtE(l.precioVenta)} /ud = ${fmtE(l.precioVenta * l.qty)}`
  ).join('\n');
  const dtoPart = descuento > 0
    ? `Descuento (${descuento}%): -${fmtE(subtotalBruto - subtotal)}\n`
    : '';
  const notaPart = nota?.trim() ? `\n📝 ${nota.trim()}` : '';
  return (
`🧾 PRESUPUESTO RÁPIDO
${cabecera}─────────────────────
${lineasTxt}
─────────────────────
Subtotal: ${fmtE(subtotalBruto)}
${dtoPart}IVA (${pct}%): ${fmtE(iva)}
TOTAL: ${fmtE(total)}${notaPart}`
  );
}

// ──────────────────── Modal QR ────────────────────
function ModalQR({ mensaje, onCerrar, onCopiar, copiado }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !mensaje) return;
    QRCode.toCanvas(canvasRef.current, mensaje, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#1a1a2e', light: '#ffffff' },
    }).catch(() => {});
  }, [mensaje]);

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-sm flex flex-col items-center gap-4 py-6">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-success" /> Compartir presupuesto
          </h3>
          <button onClick={onCerrar} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-base-content/60 text-center -mt-2">
          Escanea con tu móvil para ver el presupuesto completo
        </p>
        <canvas ref={canvasRef} className="rounded-xl shadow border border-base-300" />
        <button
          onClick={onCopiar}
          className={`btn w-full gap-2 ${copiado ? 'btn-success' : 'btn-outline'}`}
        >
          {copiado
            ? <><CheckCircle2 className="w-4 h-4" /> ¡Copiado!</>
            : <><Copy className="w-4 h-4" /> Copiar texto</>}
        </button>
      </div>
      <div className="modal-backdrop" onClick={onCerrar} />
    </div>
  );
}

// ─────────────────────────── component ───────────────────────────
const RECIENTES_KEY = 'presupRapido_recientes';

export default function PresupuestoRapidoPage() {
  const { data: productos = [] } = useSWR('/api/productos', fetcher);
  const { data: margenes  = [] } = useSWR('/api/pricing/margenes', fetcher);
  const { data: config }         = useSWR('/api/config', fetcher);

  const ivaRate = config?.iva_rate > 1 ? config.iva_rate / 100 : (config?.iva_rate || 0.21);

  const [cliente,          setCliente]          = useState('');
  const [lineas,           setLineas]           = useState([]);
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [descuento,        setDescuento]        = useState('');   // % string
  const [nota,             setNota]             = useState('');
  const [modalAbierto,     setModalAbierto]     = useState(false);
  const [modalQR,          setModalQR]          = useState(false);
  const [copiado,          setCopiado]          = useState(false);
  const [editandoPrecioId, setEditandoPrecioId] = useState(null);
  const [recientes,        setRecientes]        = useState([]);
  const [savedId,          setSavedId]          = useState(null);  // id del presupuesto guardado

  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    try { setRecientes(JSON.parse(localStorage.getItem(RECIENTES_KEY) || '[]')); } catch {}
  }, []);

  const margenSeleccionado = useMemo(
    () => margenes.find(m => String(m.id) === String(selectedMarginId)) || null,
    [margenes, selectedMarginId],
  );

  const totalQty = lineas.reduce((s, l) => s + l.qty, 0);

  const lineasCalculadas = useMemo(() =>
    lineas.map(l => ({
      ...l,
      precioVenta: l.precioOverride != null
        ? l.precioOverride
        : calcPrecioVenta(l.basePrice, margenSeleccionado, totalQty),
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [lineas, margenSeleccionado, totalQty]);

  const subtotalBruto = lineasCalculadas.reduce((s, l) => s + l.precioVenta * l.qty, 0);
  const pctDto        = Math.min(100, Math.max(0, parseFloat(descuento) || 0));
  const subtotal      = subtotalBruto * (1 - pctDto / 100);
  const iva           = subtotal * ivaRate;
  const total         = subtotal + iva;

  const mensaje = useMemo(
    () => formatearMensaje(cliente, lineasCalculadas, subtotalBruto, pctDto, subtotal, iva, total, ivaRate, nota),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cliente, lineasCalculadas, subtotalBruto, pctDto, subtotal, iva, total, ivaRate, nota],
  );

  // ── añadir producto (desde modal o desde recientes) ──
  const addProducto = useCallback((producto) => {
    setModalAbierto(false);
    setSavedId(null);
    setLineas(prev => {
      const existe = prev.find(l => l.productoId === producto.id);
      if (existe) return prev.map(l => l.productoId === producto.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, {
        id:            Date.now(),
        productoId:    producto.id,
        nombre:        producto.nombre || generarCodigo(producto),
        basePrice:     parseFloat(producto.precioUnitario) || 0,
        precioVenta:   parseFloat(producto.precioUnitario) || 0,
        precioOverride: null,
        qty:           1,
      }];
    });
    // Guardar en recientes
    try {
      const snap = JSON.parse(localStorage.getItem(RECIENTES_KEY) || '[]');
      const updated = [
        { id: producto.id, nombre: producto.nombre || generarCodigo(producto), precioUnitario: producto.precioUnitario },
        ...snap.filter(r => r.id !== producto.id),
      ].slice(0, 5);
      localStorage.setItem(RECIENTES_KEY, JSON.stringify(updated));
      setRecientes(updated);
    } catch {}
  }, []);

  const handleQty = (id, val) => {
    const n = Math.max(0.01, parseFloat(val) || 1);
    setLineas(prev => prev.map(l => l.id === id ? { ...l, qty: n } : l));
    setSavedId(null);
  };

  const handleEliminar = (id) => { setLineas(prev => prev.filter(l => l.id !== id)); setSavedId(null); };

  const handleSetPrecioOverride = (id, val) => {
    const v = parseFloat(val);
    setLineas(prev => prev.map(l => l.id === id
      ? { ...l, precioOverride: (!val || isNaN(v)) ? null : v }
      : l
    ));
    setEditandoPrecioId(null);
    setSavedId(null);
  };

  const handleNuevo = () => {
    setCliente(''); setLineas([]); setSelectedMarginId('');
    setDescuento(''); setNota(''); setSavedId(null); setStatus(null);
  };

  // ── clipboard compatible con HTTP ──
  const copiarTexto = (texto) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise((resolve, reject) => {
      const el = document.createElement('textarea');
      el.value = texto;
      el.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(el);
      el.focus(); el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      ok ? resolve() : reject(new Error('execCommand failed'));
    });
  };

  const handleCopiar = async () => {
    try {
      await copiarTexto(mensaje);
      setStatus({ type: 'success', text: 'Texto copiado al portapapeles.' });
    } catch {
      setStatus({ type: 'error', text: 'No se pudo copiar.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleCopiarEnModal = async () => {
    try {
      await copiarTexto(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setStatus({ type: 'error', text: 'No se pudo copiar.' });
      setModalQR(false);
    }
  };

  const handleCompartir = async () => {
    if (!lineas.length) { setStatus({ type: 'error', text: 'Añade al menos un producto.' }); return; }
    if (navigator.share) {
      const titulo = cliente ? `Presupuesto — ${cliente}` : 'Presupuesto rápido';
      try { await navigator.share({ title: titulo, text: mensaje }); }
      catch (err) { if (err.name !== 'AbortError') setStatus({ type: 'error', text: 'No se pudo compartir.' }); }
    } else {
      setCopiado(false); setModalQR(true);
    }
  };

  // ── guardar → devuelve el id ──
  const guardarPresupuesto = async () => {
    // No guardamos marginId: los unitPrice ya tienen el margen aplicado (precioVenta).
    // Si guardásemos marginId, el generador de PDF volvería a multiplicar por el margen
    // y el PDF mostraría precios incorrectos (doble aplicación del margen).
    const payload = {
      notas:  cliente || undefined,
      estado: 'Borrador',
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
    return data;
  };

  const handleGuardar = async () => {
    if (!lineas.length) { setStatus({ type: 'error', text: 'Añade al menos un producto.' }); return; }
    setSaving(true); setStatus(null);
    try {
      const data = await guardarPresupuesto();
      setSavedId(data.id);
      setStatus({ type: 'success', text: `Guardado como presupuesto ${data.numero || ''}.`, id: data.id, numero: data.numero });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const handlePdf = async () => {
    if (!lineas.length) { setStatus({ type: 'error', text: 'Añade al menos un producto.' }); return; }
    setGeneratingPdf(true); setStatus(null);
    try {
      let id = savedId;
      if (!id) {
        const data = await guardarPresupuesto();
        id = data.id;
        setSavedId(id);
        setStatus({ type: 'success', text: `Guardado como presupuesto ${data.numero || ''}.`, id, numero: data.numero });
      }
      window.open(`/api/presupuestos/${id}/pdf`, '_blank');
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    } finally { setGeneratingPdf(false); }
  };

  const pct = Math.round(ivaRate * 100);

  // Recientes que todavía existen en el catálogo cargado
  const recientesValidos = useMemo(() =>
    recientes.filter(r => productos.find(p => p.id === r.id)),
  [recientes, productos]);

  return (
    <>
      <div className="min-h-screen bg-base-200">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-36 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-2">
            <Link href="/ventas" className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-6 h-6 text-success" />
              <h1 className="text-xl font-bold leading-tight">Presupuesto rápido</h1>
            </div>
            {lineas.length > 0 && (
              <button onClick={handleNuevo} className="btn btn-ghost btn-sm gap-1.5 text-base-content/50">
                <RotateCcw className="w-4 h-4" /> Nuevo
              </button>
            )}
          </div>

          {/* Cliente */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4">
              <input
                type="text"
                className="input input-ghost w-full text-base font-medium placeholder:text-base-content/30 focus:outline-none px-0"
                placeholder="Nombre del cliente (opcional)"
                value={cliente}
                onChange={e => { setCliente(e.target.value); setSavedId(null); }}
              />
            </div>
          </div>

          {/* Margen + Descuento */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4 space-y-3">
              {margenes.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide block mb-1">
                    Margen de precio
                  </label>
                  <div className="relative">
                    <select
                      className="select select-ghost w-full text-sm font-medium pl-0 pr-8 focus:outline-none appearance-none bg-transparent"
                      value={selectedMarginId}
                      onChange={e => { setSelectedMarginId(e.target.value); setSavedId(null); }}
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
              )}

              {/* Descuento global */}
              <div className="flex items-center gap-3">
                <Percent className="w-4 h-4 text-base-content/40 shrink-0" />
                <input
                  type="number"
                  min="0" max="100" step="1"
                  className="input input-ghost input-sm flex-1 px-0 font-medium placeholder:text-base-content/30 focus:outline-none"
                  placeholder="Descuento global (ej. 10)"
                  value={descuento}
                  onChange={e => { setDescuento(e.target.value); setSavedId(null); }}
                />
                <span className="text-sm text-base-content/50 shrink-0">%</span>
              </div>
            </div>
          </div>

          {/* Últimos productos usados */}
          {recientesValidos.length > 0 && lineas.length === 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4">
                <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Usados recientemente
                </p>
                <div className="flex flex-wrap gap-2">
                  {recientesValidos.map(r => (
                    <button
                      key={r.id}
                      onClick={() => addProducto(productos.find(p => p.id === r.id))}
                      className="btn btn-xs btn-outline gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="max-w-[160px] truncate">{r.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Líneas de producto */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Productos</span>
                <button onClick={() => setModalAbierto(true)} className="btn btn-success btn-sm gap-1.5">
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {editandoPrecioId === l.id ? (
                        <input
                          type="number"
                          autoFocus
                          defaultValue={l.precioVenta}
                          step="0.01"
                          className="input input-xs input-bordered w-24 font-mono"
                          onBlur={e => handleSetPrecioOverride(l.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSetPrecioOverride(l.id, e.target.value); if (e.key === 'Escape') setEditandoPrecioId(null); }}
                        />
                      ) : (
                        <button
                          className="text-xs text-base-content/50 hover:text-primary hover:underline transition-colors"
                          onClick={() => setEditandoPrecioId(l.id)}
                          title="Toca para editar el precio"
                        >
                          {fmtE(l.precioVenta)} /ud
                          {l.precioOverride != null && <span className="ml-1 badge badge-xs badge-warning">manual</span>}
                          {l.precioOverride == null && margenSeleccionado && l.basePrice > 0 &&
                            <span className="ml-1 opacity-60">(base {fmtE(l.basePrice)})</span>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
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

          {/* Nota libre */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body py-3 px-4">
              <div className="flex items-start gap-2">
                <StickyNote className="w-4 h-4 text-base-content/40 mt-2 shrink-0" />
                <textarea
                  className="textarea textarea-ghost w-full text-sm placeholder:text-base-content/30 focus:outline-none resize-none px-0 py-1.5"
                  placeholder="Nota para el cliente (ej. Oferta válida 7 días, precio especial por volumen...)"
                  rows={2}
                  value={nota}
                  onChange={e => { setNota(e.target.value); setSavedId(null); }}
                />
              </div>
            </div>
          </div>

          {/* Totales */}
          {lineasCalculadas.length > 0 && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body py-3 px-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Subtotal</span>
                  <span className="font-mono">{fmtE(subtotalBruto)}</span>
                </div>
                {pctDto > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Descuento ({pctDto}%)</span>
                    <span className="font-mono">−{fmtE(subtotalBruto - subtotal)}</span>
                  </div>
                )}
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
              {status.id && (
                <Link href={`/presupuestos/${status.id}`} className="btn btn-xs btn-ghost gap-1">
                  Ver <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              <button onClick={() => setStatus(null)} className="btn btn-ghost btn-xs btn-square">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Barra de acciones flotante */}
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 px-4 z-30"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', paddingTop: '0.75rem' }}>
          <div className="max-w-lg mx-auto flex gap-2">
            <button
              onClick={handleCopiar}
              disabled={!lineas.length}
              className="btn btn-outline btn-sm sm:btn-md"
              title="Copiar texto"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleCompartir}
              disabled={!lineas.length}
              className="btn btn-success flex-1 gap-1.5 btn-sm sm:btn-md"
            >
              <Share2 className="w-4 h-4" /> Compartir
            </button>
            <button
              onClick={handlePdf}
              disabled={!lineas.length || generatingPdf}
              className="btn btn-outline btn-sm sm:btn-md"
              title="Descargar PDF"
            >
              {generatingPdf
                ? <span className="loading loading-spinner loading-xs" />
                : <FileDown className="w-4 h-4" />}
            </button>
            <button
              onClick={handleGuardar}
              disabled={!lineas.length || saving || !!savedId}
              className={`btn flex-1 gap-1.5 btn-sm sm:btn-md ${savedId ? 'btn-success' : 'btn-primary'}`}
            >
              {saving
                ? <span className="loading loading-spinner loading-xs" />
                : savedId
                  ? <><CheckCircle2 className="w-4 h-4" /> Guardado</>
                  : <><Save className="w-4 h-4" /> Guardar</>}
            </button>
          </div>
        </div>
      </div>

      <ModalBusquedaProductos
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
        alSeleccionar={addProducto}
        items={productos}
      />

      {modalQR && (
        <ModalQR
          mensaje={mensaje}
          onCerrar={() => setModalQR(false)}
          onCopiar={handleCopiarEnModal}
          copiado={copiado}
        />
      )}
    </>
  );
}
