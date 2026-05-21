"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  ArrowLeft, Download, Trash2, CheckCircle, Receipt,
  Clipboard, Package, AlertTriangle, ExternalLink, Lock, ShieldCheck,
  RotateCcw, FileWarning, FileCode, Pencil,
} from 'lucide-react';
import { toast } from '@/lib/toast';

// ── Stepper de estado ─────────────────────────────────────────────────────────
function StepperFactura({ estado }) {
  const cancelada = estado === 'CANCELADA';
  const pasos = [
    { key: 'BORRADOR', label: 'Borrador' },
    { key: 'EMITIDA',  label: 'Emitida'  },
    { key: 'PAGADA',   label: 'Pagada'   },
  ];
  const idxActual = pasos.findIndex(p => p.key === estado);

  return (
    <div className="flex items-center gap-0 flex-wrap mt-3">
      {pasos.map(({ key, label }, i) => {
        const completado = !cancelada && i < idxActual;
        const activo     = !cancelada && i === idxActual;
        return (
          <span key={key} className="flex items-center gap-0">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
              cancelada  ? 'text-base-content/25 bg-base-200' :
              completado ? 'text-success-content bg-success'  :
              activo     ? 'text-primary-content bg-primary'  :
                           'text-base-content/40 bg-base-200'
            }`}>
              {completado ? '✓ ' : `${i + 1}. `}{label}
            </span>
            {i < pasos.length - 1 && (
              <span className={`block h-px w-6 shrink-0 ${completado && !cancelada ? 'bg-success' : 'bg-base-300'}`} />
            )}
          </span>
        );
      })}
      {cancelada && (
        <span className="flex items-center gap-0">
          <span className="block h-px w-6 shrink-0 bg-error/30" />
          <span className="text-xs font-semibold px-3 py-1 rounded-full text-error-content bg-error">
            ✕ Cancelada
          </span>
        </span>
      )}
    </div>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────
const ESTADO_BADGE = {
  BORRADOR:  'badge-ghost',
  EMITIDA:   'badge-info',
  PAGADA:    'badge-success',
  CANCELADA: 'badge-error',
};

const TRANSICIONES = {
  BORRADOR:  ['EMITIDA', 'CANCELADA'],
  EMITIDA:   ['PAGADA',  'CANCELADA'],
  PAGADA:    [],
  CANCELADA: [],
};

const ESTADO_LABEL = {
  EMITIDA:   'Emitir factura',
  PAGADA:    'Marcar como pagada',
  CANCELADA: 'Cancelar factura',
};

const ESTADO_BTN = {
  EMITIDA:   'btn-primary',
  PAGADA:    'btn-success',
  CANCELADA: 'btn-error btn-outline',
};

const TIPO_RECT_LABEL = {
  R1: 'R1 — Error fundado en derecho',
  R2: 'R2 — Concurso de acreedores',
  R3: 'R3 — Deudas incobrables',
  R4: 'R4 — Corrección de errores',
  R5: 'R5 — Simplificada',
};

const ESTADO_TOAST = {
  EMITIDA:   'Factura emitida y registrada en VeriFactu',
  PAGADA:    'Factura marcada como pagada',
  CANCELADA: 'Factura cancelada',
};

// ── Página ────────────────────────────────────────────────────────────────────
export default function FacturaDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);
  const [csv, setCsv]                       = useState('');
  const [guardandoCsv, setGuardandoCsv]     = useState(false);
  const [modalRect, setModalRect]           = useState(false);
  const [rectForm, setRectForm]             = useState({ tipoFactura: 'R1', tipoRectificativa: 'I', notas: '' });
  const [enviandoRect, setEnviandoRect]     = useState(false);
  const [editItems, setEditItems]           = useState(null);
  const [guardandoItems, setGuardandoItems] = useState(false);

  const { data: factura, isLoading } = useSWR(id ? `/api/facturas/${id}` : null);

  async function cambiarEstado(nuevoEstado) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar');
      mutate(`/api/facturas/${id}`, data, { revalidate: false });
      toast(ESTADO_TOAST[nuevoEstado] || 'Estado actualizado');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarAeat() {
    setGuardandoCsv(true);
    try {
      const res = await fetch(`/api/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoEnvioAeat: 'CONFIRMADO', csvAeat: csv.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      mutate(`/api/facturas/${id}`, data, { revalidate: false });
      toast('Confirmación AEAT guardada');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoCsv(false);
    }
  }

  async function emitirRectificativa() {
    setEnviandoRect(true);
    setError(null);
    try {
      const res = await fetch(`/api/facturas/${id}/rectificativa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear rectificativa');
      setModalRect(false);
      router.push(`/facturas/${data.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviandoRect(false);
    }
  }

  function iniciarEdicion() {
    setEditItems((factura.items || []).map(i => ({ ...i })));
  }

  function updateItem(idx, field, value) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addItem() {
    setEditItems(prev => [...prev, { descripcion: '', quantity: 1, unitPrice: 0, pesoUnitario: 0, detallesTecnicos: null }]);
  }

  function removeItem(idx) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function guardarItems() {
    const validos = editItems.filter(i => i.descripcion.trim());
    if (!validos.length) { setError('Añade al menos una línea con descripción'); return; }
    setGuardandoItems(true);
    setError(null);
    try {
      const res = await fetch(`/api/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al guardar');
      mutate(`/api/facturas/${id}`, data, { revalidate: false });
      setEditItems(null);
      toast('Líneas de factura guardadas');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoItems(false);
    }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/facturas/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al eliminar');
      }
      router.push('/facturas');
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-base-content/50">Factura no encontrada</p>
        <Link href="/facturas" className="btn btn-ghost btn-sm mt-4">← Volver</Link>
      </div>
    );
  }

  const transiciones    = TRANSICIONES[factura.estado] || [];
  const esInmutable     = ['EMITIDA', 'PAGADA'].includes(factura.estado);
  const esRectificativa = factura.tipoFactura?.startsWith('R');
  const tieneRectActiva = factura.rectificativas?.some(r => r.estado !== 'CANCELADA');
  const puedeRectificar = esInmutable && !esRectificativa && !tieneRectActiva;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/facturas" className="btn btn-ghost btn-xs gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Facturas
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            {factura.numero}
            {esInmutable && <Lock className="w-4 h-4 text-base-content/30" title="Factura inmutable" />}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {esRectificativa && (
              <span className="badge badge-warning badge-outline text-xs">
                {TIPO_RECT_LABEL[factura.tipoFactura] || factura.tipoFactura}
              </span>
            )}
            <span className="text-sm text-base-content/50">
              {new Date(factura.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {factura.fechaVencimiento && (
              <span className={`text-sm ${new Date(factura.fechaVencimiento) < new Date() && factura.estado === 'EMITIDA' ? 'text-error font-semibold' : 'text-base-content/50'}`}>
                · Vence {new Date(factura.fechaVencimiento).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
          <StepperFactura estado={factura.estado} />
        </div>

        <div className="flex gap-2 flex-wrap">
          {transiciones.map(est => (
            <button key={est} onClick={() => cambiarEstado(est)} disabled={loading}
              className={`btn btn-sm gap-1 ${ESTADO_BTN[est] || 'btn-ghost'}`}>
              <CheckCircle className="w-4 h-4" />
              {ESTADO_LABEL[est]}
            </button>
          ))}

          {puedeRectificar && (
            <button onClick={() => setModalRect(true)} disabled={loading}
              className="btn btn-sm btn-warning btn-outline gap-1">
              <RotateCcw className="w-4 h-4" /> Emitir rectificativa
            </button>
          )}

          <a href={`/api/facturas/${id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="btn btn-sm btn-outline gap-1">
            <Download className="w-4 h-4" /> PDF
          </a>

          {factura.huella && factura.estadoEnvioAeat !== 'CONFIRMADO' && (
            <a href={`/api/facturas/${id}/xml`}
              className="btn btn-sm btn-outline gap-1"
              title="Descargar XML VeriFactu para subir a la AEAT">
              <FileCode className="w-4 h-4" /> XML AEAT
            </a>
          )}

          {factura.estado === 'BORRADOR' && (
            <button onClick={eliminar} disabled={loading} className="btn btn-sm btn-ghost text-error gap-1">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {esInmutable && (
        <div className="alert alert-info text-sm py-2">
          <Lock className="w-4 h-4 shrink-0" />
          Esta factura está <strong>{factura.estado.toLowerCase()}</strong> y no puede modificarse.
          {!esRectificativa && ' Las rectificaciones se gestionan mediante facturas rectificativas.'}
        </div>
      )}

      {/* Referencia a factura original (si es rectificativa) */}
      {esRectificativa && factura.facturaOriginal && (
        <div className="alert alert-warning text-sm py-2">
          <FileWarning className="w-4 h-4 shrink-0" />
          <span>
            Rectificativa de{' '}
            <Link href={`/facturas/${factura.facturaOriginal.id}`}
              className="font-semibold underline underline-offset-2">
              {factura.facturaOriginal.numero}
            </Link>
            {' · '}
            Modalidad: <strong>{factura.tipoRectificativa === 'S' ? 'Sustitución' : 'Diferencias'}</strong>
          </span>
        </div>
      )}

      {/* Info general */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/50 mb-2">Cliente</h3>
            {factura.cliente ? (
              <>
                <p className="font-semibold">{factura.cliente.nombre}</p>
                {factura.cliente.direccion && <p className="text-sm text-base-content/60">{factura.cliente.direccion}</p>}
                {factura.cliente.telefono  && <p className="text-sm text-base-content/60">{factura.cliente.telefono}</p>}
              </>
            ) : (
              <p className="text-base-content/40">Sin cliente asignado</p>
            )}
          </div>
        </div>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/50 mb-2">Documento origen</h3>
            {factura.albaran ? (
              <Link href={`/albaranes/${factura.albaran.id}`}
                className="flex items-center gap-2 font-semibold text-primary hover:underline">
                <Clipboard className="w-4 h-4" />
                {factura.albaran.numero}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ) : factura.pedido ? (
              <Link href={`/pedidos/${factura.pedido.id}`}
                className="flex items-center gap-2 font-semibold text-primary hover:underline">
                <Package className="w-4 h-4" />
                {factura.pedido.numero}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ) : (
              <p className="text-base-content/40">Factura manual</p>
            )}
            {factura.notas && (
              <p className="text-sm text-base-content/60 mt-2 border-t border-base-300 pt-2">{factura.notas}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rectificativas emitidas sobre esta factura */}
      {factura.rectificativas?.length > 0 && (
        <div className="card bg-base-200 border border-warning/30">
          <div className="card-body p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider text-base-content/50">
              <RotateCcw className="w-4 h-4" /> Rectificativas
            </h3>
            <div className="space-y-1">
              {factura.rectificativas.map(r => (
                <Link key={r.id} href={`/facturas/${r.id}`}
                  className="flex items-center justify-between gap-4 p-2 rounded hover:bg-base-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{r.numero}</span>
                    <span className="badge badge-xs badge-warning">{r.tipoFactura}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-xs ${ESTADO_BADGE[r.estado] || 'badge-ghost'}`}>
                      {r.estado.charAt(0) + r.estado.slice(1).toLowerCase()}
                    </span>
                    <span className="text-xs text-base-content/40">
                      {new Date(r.fechaCreacion).toLocaleDateString('es-ES')}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-30" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección VeriFactu (solo facturas con huella) */}
      {factura.huella && (
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" /> VeriFactu
              <span className={`badge badge-sm ml-auto ${
                factura.estadoEnvioAeat === 'CONFIRMADO' ? 'badge-success' :
                factura.estadoEnvioAeat === 'EXPORTADO'  ? 'badge-info' :
                'badge-warning'
              }`}>
                {factura.estadoEnvioAeat === 'CONFIRMADO' ? 'Confirmado por AEAT' :
                 factura.estadoEnvioAeat === 'EXPORTADO'  ? 'XML exportado' : 'Pendiente de exportar'}
              </span>
            </h3>

            <div className="text-xs font-mono text-base-content/50 break-all mb-3">
              <span className="text-base-content/40">Huella: </span>{factura.huella}
            </div>

            {factura.estadoEnvioAeat !== 'CONFIRMADO' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input input-bordered input-sm flex-1 font-mono"
                  placeholder="CSV de confirmación AEAT (opcional)"
                  value={csv || factura.csvAeat || ''}
                  onChange={e => setCsv(e.target.value)}
                />
                <button onClick={confirmarAeat} disabled={guardandoCsv}
                  className="btn btn-sm btn-success gap-1 shrink-0">
                  {guardandoCsv
                    ? <span className="loading loading-spinner loading-xs" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                  Confirmar AEAT
                </button>
              </div>
            )}
            {factura.estadoEnvioAeat === 'CONFIRMADO' && factura.csvAeat && (
              <p className="text-xs font-mono text-success">CSV: {factura.csvAeat}</p>
            )}
          </div>
        </div>
      )}

      {/* Tabla de ítems + desglose IVA */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Líneas de factura</h3>
            {factura.estado === 'BORRADOR' && !editItems && (
              <button onClick={iniciarEdicion} className="btn btn-outline btn-sm gap-1">
                <Pencil className="w-3.5 h-3.5" /> Editar líneas
              </button>
            )}
            {editItems && (
              <div className="flex gap-2">
                <button onClick={() => setEditItems(null)} className="btn btn-ghost btn-xs">Cancelar</button>
                <button onClick={guardarItems} disabled={guardandoItems} className="btn btn-primary btn-xs gap-1">
                  {guardandoItems ? <span className="loading loading-spinner loading-xs" /> : null}
                  Guardar cambios
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-right">P. Unit.</th>
                  <th className="text-right">Total</th>
                  {editItems && <th></th>}
                </tr>
              </thead>
              <tbody>
                {editItems
                  ? editItems.map((item, idx) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={idx}>
                          <td>
                            <input className="input input-bordered input-xs w-full"
                              value={item.descripcion}
                              onChange={e => updateItem(idx, 'descripcion', e.target.value)}
                              placeholder="Descripción" />
                          </td>
                          <td className="w-20">
                            <input type="number" step="1"
                              className="input input-bordered input-xs w-16 text-center"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                          </td>
                          <td className="w-28">
                            <input type="number" step="0.01"
                              className="input input-bordered input-xs w-24 text-right"
                              value={item.unitPrice}
                              onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                          </td>
                          <td className="text-right font-semibold w-24">{lineTotal.toFixed(2)} €</td>
                          <td className="w-8">
                            <button onClick={() => removeItem(idx)}
                              className="btn btn-ghost btn-xs text-error px-1">✕</button>
                          </td>
                        </tr>
                      );
                    })
                  : (factura.items || []).map(item => (
                      <tr key={item.id}>
                        <td>
                          <p className="font-medium">{item.descripcion}</p>
                          {item.producto && <p className="text-xs text-base-content/50">{item.producto.nombre}</p>}
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.unitPrice.toFixed(2)} €</td>
                        <td className="text-right font-semibold">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                      </tr>
                    ))
                }
                {editItems && (
                  <tr>
                    <td colSpan={5}>
                      <button onClick={addItem} className="btn btn-ghost btn-xs gap-1 text-primary">
                        + Añadir línea
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Desglose IVA — se recalcula en tiempo real al editar */}
          {(() => {
            const rows  = editItems || factura.items || [];
            const sub   = rows.reduce((a, i) => a + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
            const tax   = sub * 0.21;
            const total = sub + tax;
            return (
              <div className="flex justify-end mt-4">
                <div className="border border-base-300 rounded-lg p-4 min-w-52 space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-base-content/60">Base imponible</span>
                    <span>{sub.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-base-content/60">IVA (21%)</span>
                    <span>{tax.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between gap-8 pt-2 border-t border-base-300 font-bold text-base">
                    <span>Total factura</span>
                    <span>{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal emitir rectificativa */}
      {modalRect && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-warning" />
              Emitir factura rectificativa
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Tipo de rectificativa</span></label>
                <select className="select select-bordered select-sm"
                  value={rectForm.tipoFactura}
                  onChange={e => setRectForm(f => ({ ...f, tipoFactura: e.target.value }))}>
                  {Object.entries(TIPO_RECT_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Modalidad</span></label>
                <div className="flex gap-4">
                  {[['I', 'Diferencias — importes de la diferencia'], ['S', 'Sustitución — importes correctos']].map(([v, l]) => (
                    <label key={v} className="flex items-start gap-2 cursor-pointer flex-1">
                      <input type="radio" name="tipoRectificativa" className="radio radio-sm mt-0.5"
                        value={v} checked={rectForm.tipoRectificativa === v}
                        onChange={() => setRectForm(f => ({ ...f, tipoRectificativa: v }))} />
                      <span className="text-sm">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Motivo (notas)</span></label>
                <textarea className="textarea textarea-bordered textarea-sm" rows={2}
                  placeholder="Describe el motivo de la rectificación…"
                  value={rectForm.notas}
                  onChange={e => setRectForm(f => ({ ...f, notas: e.target.value }))} />
              </div>

              <div className="alert alert-info text-xs py-2">
                Se creará una rectificativa en estado Borrador copiando las líneas de esta factura.
                Podrás editarla antes de emitirla.
              </div>
            </div>

            <div className="modal-action">
              <button onClick={() => setModalRect(false)} className="btn btn-ghost btn-sm">Cancelar</button>
              <button onClick={emitirRectificativa} disabled={enviandoRect}
                className="btn btn-warning btn-sm gap-1">
                {enviandoRect
                  ? <span className="loading loading-spinner loading-xs" />
                  : <RotateCcw className="w-4 h-4" />
                }
                Crear rectificativa
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalRect(false)} />
        </div>
      )}
    </div>
  );
}
