"use client";

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, FileDown, Trash2, FileCheck } from 'lucide-react';
import { toastError, toast } from '@/lib/toast';

export default function AlbaranDetallePage() {
  const { id } = useParams();
  const router  = useRouter();
  const { data: albaran, isLoading } = useSWR(id ? `/api/albaranes/${id}` : null);

  const handleEliminar = async () => {
    if (!confirm('¿Eliminar este albarán? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/albaranes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toastError(data.message || 'No se pudo eliminar el albarán');
        return;
      }
      toast('Albarán eliminado');
      router.push('/albaranes');
    } catch {
      toastError('Error al eliminar el albarán');
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );

  if (!albaran) return (
    <div className="text-center p-8 text-error">Albarán no encontrado.</div>
  );

  const fecha = albaran.fechaCreacion
    ? new Date(albaran.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/albaranes" className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="w-4 h-4" /> Albaranes
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6" />
            {albaran.numero}
          </h1>
          <span className="badge badge-warning">Sin valorar</span>
        </div>

        <div className="flex gap-2">
          <a
            href={`/api/albaranes/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary gap-2"
          >
            <FileDown className="w-4 h-4" /> Abrir PDF
          </a>
          <button className="btn btn-outline btn-error gap-2" onClick={handleEliminar} disabled={!!albaran.factura}>
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>

      {/* Info principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body py-4">
            <p className="text-xs text-base-content/50 uppercase font-semibold mb-1">Cliente</p>
            {albaran.cliente ? (
              <>
                <p className="font-bold text-lg">{albaran.cliente.nombre}</p>
                {albaran.cliente.nif && <p className="text-sm text-base-content/60">NIF: {albaran.cliente.nif}</p>}
                {albaran.cliente.direccion && <p className="text-sm text-base-content/60">{albaran.cliente.direccion}</p>}
                {albaran.cliente.telefono && <p className="text-sm text-base-content/60">Tel: {albaran.cliente.telefono}</p>}
              </>
            ) : (
              <p className="text-base-content/40 italic">Sin cliente</p>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-base-content/50 uppercase text-xs font-semibold">Fecha</span>
              <span className="font-medium">{fecha}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-base-content/50 uppercase text-xs font-semibold">Estado</span>
              <span className="badge badge-sm badge-warning">{albaran.estado}</span>
            </div>
            {albaran.pedido && (
              <div className="flex justify-between text-sm">
                <span className="text-base-content/50 uppercase text-xs font-semibold">Pedido</span>
                <Link href={`/pedidos/${albaran.pedido.id}`} className="link link-primary font-medium">
                  {albaran.pedido.numero}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla ítems */}
      <div className="card bg-base-100 shadow border border-base-200 mb-6">
        <div className="card-body p-0">
          <table className="table table-sm w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Descripción</th>
                <th className="text-center w-28">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {(albaran.items || []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center text-base-content/40 italic py-6">Sin ítems</td>
                </tr>
              ) : (
                albaran.items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <p className="font-medium">{item.descripcion}</p>
                      {item.producto?.nombre && item.producto.nombre !== item.descripcion && (
                        <p className="text-xs text-base-content/40">{item.producto.nombre}</p>
                      )}
                    </td>
                    <td className="text-center font-bold text-lg">{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas */}
      {albaran.notas && (
        <div className="card bg-base-100 shadow border border-base-200 mb-6">
          <div className="card-body py-4">
            <p className="text-xs text-base-content/50 uppercase font-semibold mb-1">Observaciones</p>
            <p className="text-sm whitespace-pre-wrap">{albaran.notas}</p>
          </div>
        </div>
      )}

      {albaran.factura && (
        <div className="alert alert-info">
          <span>Este albarán tiene una factura asociada: <strong>{albaran.factura.numero}</strong></span>
        </div>
      )}
    </div>
  );
}
