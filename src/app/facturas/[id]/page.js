"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  ArrowLeft, Download, Trash2, CheckCircle, Receipt,
  Clipboard, Package, AlertTriangle, ExternalLink, Lock,
} from 'lucide-react';

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

export default function FacturaDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

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
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al actualizar');
      }
      mutate(`/api/facturas/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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

  const transiciones = TRANSICIONES[factura.estado] || [];
  const esInmutable  = ['EMITIDA', 'PAGADA'].includes(factura.estado);

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
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge ${ESTADO_BADGE[factura.estado] || 'badge-ghost'}`}>
              {factura.estado.charAt(0) + factura.estado.slice(1).toLowerCase()}
            </span>
            <span className="text-sm text-base-content/50">
              {new Date(factura.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {factura.fechaVencimiento && (
              <span className={`text-sm ${new Date(factura.fechaVencimiento) < new Date() && factura.estado === 'EMITIDA' ? 'text-error font-semibold' : 'text-base-content/50'}`}>
                · Vence {new Date(factura.fechaVencimiento).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {transiciones.map(est => (
            <button key={est} onClick={() => cambiarEstado(est)} disabled={loading}
              className={`btn btn-sm gap-1 ${ESTADO_BTN[est] || 'btn-ghost'}`}>
              <CheckCircle className="w-4 h-4" />
              {ESTADO_LABEL[est]}
            </button>
          ))}

          <a href={`/api/facturas/${id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="btn btn-sm btn-outline gap-1">
            <Download className="w-4 h-4" /> PDF
          </a>

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
          Esta factura está en estado <strong>{factura.estado.toLowerCase()}</strong> y no puede modificarse.
          Las rectificaciones se gestionarán mediante facturas rectificativas (Fase D — VeriFactu).
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

      {/* Tabla de ítems + desglose IVA */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <h3 className="font-semibold mb-3">Líneas de factura</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-right">P. Unit.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(factura.items || []).map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.descripcion}</p>
                      {item.producto && <p className="text-xs text-base-content/50">{item.producto.nombre}</p>}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{item.unitPrice.toFixed(2)} €</td>
                    <td className="text-right font-semibold">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Desglose IVA */}
          <div className="flex justify-end mt-4">
            <div className="border border-base-300 rounded-lg p-4 min-w-52 space-y-2 text-sm">
              <div className="flex justify-between gap-8">
                <span className="text-base-content/60">Base imponible</span>
                <span>{factura.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-base-content/60">IVA (21%)</span>
                <span>{factura.tax.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-8 pt-2 border-t border-base-300 font-bold text-base">
                <span>Total factura</span>
                <span>{factura.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
