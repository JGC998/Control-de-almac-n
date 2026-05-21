"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
  ArrowLeft, Download, Trash2, CheckCircle, Package,
  Clipboard, AlertTriangle, ExternalLink, Receipt, Plus,
} from 'lucide-react';

const ESTADO_BADGE = {
  BORRADOR:  'badge-ghost',
  EMITIDO:   'badge-info',
  ENTREGADO: 'badge-success',
  CANCELADO: 'badge-error',
};

const TRANSICIONES = {
  BORRADOR:  ['EMITIDO', 'CANCELADO'],
  EMITIDO:   ['ENTREGADO', 'CANCELADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

const ESTADO_LABEL = {
  EMITIDO:   'Marcar emitido',
  ENTREGADO: 'Marcar entregado',
  CANCELADO: 'Cancelar albarán',
};

export default function AlbaranDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: albaran, isLoading } = useSWR(id ? `/api/albaranes/${id}` : null);
  const [generandoFactura, setGenerandoFactura] = useState(false);

  async function handleGenerarFactura() {
    setGenerandoFactura(true);
    setError(null);
    try {
      const res = await fetch(`/api/albaranes/${id}/factura`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al generar factura');
      router.push(`/facturas/${data.id}`);
    } catch (e) {
      setError(e.message);
      setGenerandoFactura(false);
    }
  }

  async function cambiarEstado(nuevoEstado) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/albaranes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al actualizar');
      }
      mutate(`/api/albaranes/${id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar este albarán? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/albaranes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al eliminar');
      }
      router.push('/albaranes');
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

  if (!albaran) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Clipboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-base-content/50">Albarán no encontrado</p>
        <Link href="/albaranes" className="btn btn-ghost btn-sm mt-4">← Volver</Link>
      </div>
    );
  }

  const transiciones = TRANSICIONES[albaran.estado] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/albaranes" className="btn btn-ghost btn-xs gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Albaranes
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clipboard className="w-6 h-6" />
            {albaran.numero}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge ${ESTADO_BADGE[albaran.estado] || 'badge-ghost'}`}>
              {albaran.estado.charAt(0) + albaran.estado.slice(1).toLowerCase()}
            </span>
            <span className="text-sm text-base-content/50">
              {new Date(albaran.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Acciones de estado */}
          {transiciones.map(est => (
            <button
              key={est}
              onClick={() => cambiarEstado(est)}
              disabled={loading}
              className={`btn btn-sm gap-1 ${est === 'CANCELADO' ? 'btn-error btn-outline' : 'btn-success'}`}
            >
              <CheckCircle className="w-4 h-4" />
              {ESTADO_LABEL[est]}
            </button>
          ))}

          {!albaran.factura && albaran.estado !== 'CANCELADO' && (
            <button onClick={handleGenerarFactura} disabled={generandoFactura}
              className="btn btn-sm btn-outline gap-1">
              {generandoFactura
                ? <span className="loading loading-spinner loading-xs" />
                : <Receipt className="w-4 h-4" />
              }
              Generar factura
            </button>
          )}

          {albaran.factura && (
            <Link href={`/facturas/${albaran.factura.id}`} className="btn btn-sm btn-ghost gap-1">
              <Receipt className="w-4 h-4" /> Ver factura
            </Link>
          )}

          <a
            href={`/api/albaranes/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline gap-1"
          >
            <Download className="w-4 h-4" /> PDF
          </a>

          {albaran.estado === 'BORRADOR' && (
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

      {/* Info general */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/50 mb-2">Cliente</h3>
            {albaran.cliente ? (
              <>
                <p className="font-semibold">{albaran.cliente.nombre}</p>
                {albaran.cliente.direccion && <p className="text-sm text-base-content/60">{albaran.cliente.direccion}</p>}
                {albaran.cliente.telefono && <p className="text-sm text-base-content/60">{albaran.cliente.telefono}</p>}
              </>
            ) : (
              <p className="text-base-content/40">Sin cliente asignado</p>
            )}
          </div>
        </div>

        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-base-content/50 mb-2">Pedido origen</h3>
            {albaran.pedido ? (
              <Link
                href={`/pedidos/${albaran.pedido.id}`}
                className="flex items-center gap-2 font-semibold text-primary hover:underline"
              >
                <Package className="w-4 h-4" />
                {albaran.pedido.numero}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ) : (
              <p className="text-base-content/40">Albarán manual</p>
            )}
            {albaran.notas && (
              <p className="text-sm text-base-content/60 mt-2 border-t border-base-300 pt-2">{albaran.notas}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de ítems */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <h3 className="font-semibold mb-3">Líneas del albarán</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-center">Cantidad</th>
                  <th className="text-right">P. Unit.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(albaran.items || []).map(item => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium">{item.descripcion}</p>
                      {item.producto && (
                        <p className="text-xs text-base-content/50">{item.producto.nombre}</p>
                      )}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{item.unitPrice.toFixed(2)} €</td>
                    <td className="text-right font-semibold">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end mt-4">
            <div className="space-y-1 min-w-48 text-sm">
              <div className="flex justify-between gap-8">
                <span className="text-base-content/60">Subtotal</span>
                <span>{albaran.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-base-content/60">IVA (21%)</span>
                <span>{albaran.tax.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-8 pt-1 border-t border-base-300 font-bold text-base">
                <span>Total</span>
                <span>{albaran.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
