"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Receipt, Clipboard, Search, Plus, AlertTriangle } from 'lucide-react';

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [query, setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const { data: albResult } = useSWR('/api/albaranes?limit=100', null, { revalidateOnFocus: false });
  const albaranes = (albResult?.data || []).filter(a => {
    if (a.estado === 'CANCELADO') return false;
    // Solo albaranes sin factura ya generada
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/facturas" className="btn btn-ghost btn-xs gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Facturas
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Nueva factura
        </h1>
        <p className="text-base-content/50 text-sm mt-1">
          Selecciona el albarán emitido desde el que generar la factura.
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
          placeholder="Buscar por número de albarán o cliente…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
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
