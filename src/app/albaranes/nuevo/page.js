"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Clipboard, Package, Search, Plus, AlertTriangle } from 'lucide-react';

export default function NuevoAlbaranPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: result } = useSWR(
    `/api/pedidos?limit=100`,
    null,
    { revalidateOnFocus: false }
  );

  const pedidos = (result?.data || result || []).filter(p => {
    if (p.estado === 'Cancelado') return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.numero?.toLowerCase().includes(q) ||
      p.cliente?.nombre?.toLowerCase().includes(q)
    );
  });

  async function generarDesde(pedido) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedidos/${pedido.id}/albaran`, { method: 'POST' });
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

      {/* Buscador */}
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

      {/* Lista de pedidos */}
      <div className="space-y-2">
        {pedidos.length === 0 && (
          <p className="text-center text-base-content/40 py-10">
            No se encontraron pedidos{query ? ` para "${query}"` : ''}
          </p>
        )}
        {pedidos.map(pedido => (
          <div
            key={pedido.id}
            className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors"
          >
            <div className="card-body p-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-base-content/40 shrink-0" />
                <div>
                  <p className="font-mono font-semibold">{pedido.numero}</p>
                  <p className="text-sm text-base-content/60">
                    {pedido.cliente?.nombre ?? 'Sin cliente'} ·{' '}
                    {new Date(pedido.fechaCreacion).toLocaleDateString('es-ES')} ·{' '}
                    {pedido.total?.toFixed(2)} €
                  </p>
                </div>
              </div>
              <button
                onClick={() => generarDesde(pedido)}
                disabled={loading}
                className="btn btn-primary btn-sm gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> Generar albarán
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
