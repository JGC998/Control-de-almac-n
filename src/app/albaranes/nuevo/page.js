"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Clipboard, Package, Search, Plus, AlertTriangle } from 'lucide-react';
import ModalTipoAlbaran from '@/componentes/albaranes/ModalTipoAlbaran';

export default function NuevoAlbaranPage() {
  const router = useRouter();
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const { data: result } = useSWR(`/api/pedidos?limit=500`, null, { revalidateOnFocus: false });

  const pedidos = (result?.data || result || []).filter(p => {
    if (p.estado === 'Cancelado') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return p.numero?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q);
  });

  async function generarDesde(pedido, valorado) {
    setPedidoSeleccionado(null);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/albaran`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al generar albarán');
      router.push(`/albaranes/${data.id}`);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/albaranes" className="btn btn-ghost btn-xs gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Albaranes
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clipboard className="w-6 h-6" /> Nuevo albarán
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Selecciona el pedido desde el que generar el albarán de entrega.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      <label className="input input-bordered flex items-center gap-2">
        <Search className="w-4 h-4 opacity-40" />
        <input
          type="text"
          className="grow"
          placeholder="Buscar por número de pedido o cliente…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </label>

      <div className="space-y-2">
        {pedidos.length === 0 && (
          <p className="text-center text-base-content/40 py-10">
            No se encontraron pedidos{query ? ` para "${query}"` : ''}
          </p>
        )}
        {pedidos.map(pedido => {
          const tieneAlbaran = (pedido._count?.albaranes || 0) > 0;
          return (
            <div key={pedido.id} className={`card border transition-colors ${tieneAlbaran ? 'bg-warning/5 border-warning/30' : 'bg-base-200 border-base-300 hover:border-primary/40'}`}>
              <div className="card-body p-4 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Package className={`w-5 h-5 shrink-0 ${tieneAlbaran ? 'text-warning' : 'text-base-content/40'}`} />
                  <div>
                    <p className="font-mono font-semibold">
                      {pedido.numero}
                      {tieneAlbaran && <span className="ml-2 badge badge-xs badge-warning">Ya tiene albarán</span>}
                    </p>
                    <p className="text-sm text-base-content/60">
                      {pedido.cliente?.nombre ?? 'Sin cliente'} ·{' '}
                      {new Date(pedido.fechaCreacion).toLocaleDateString('es-ES')} ·{' '}
                      {pedido.total?.toFixed(2)} €
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPedidoSeleccionado(pedido)}
                  disabled={loading || tieneAlbaran}
                  className="btn btn-sm gap-1 shrink-0 btn-primary disabled:opacity-50"
                  title={tieneAlbaran ? 'Este pedido ya tiene un albarán generado' : undefined}
                >
                  <Plus className="w-4 h-4" /> Generar albarán
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {pedidoSeleccionado && (
        <ModalTipoAlbaran
          pedido={pedidoSeleccionado}
          onConfirm={(valorado) => generarDesde(pedidoSeleccionado, valorado)}
          onCancel={() => setPedidoSeleccionado(null)}
        />
      )}
    </div>
  );
}
