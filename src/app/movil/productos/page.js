'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, WifiOff, Search } from 'lucide-react';
import { loadOffline } from '@/lib/offlineSync';

export default function MovilProductosPage() {
  const [productos, setProductos] = useState(null);
  const [ts, setTs] = useState(null);
  const [offline, setOffline] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    fetch('/api/productos?limit=500&activo=true')
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d) ? d : d.productos ?? d.data ?? [];
        setProductos(lista);
        setOffline(false);
      })
      .catch(async () => {
        const cached = await loadOffline('/api/productos?limit=500&activo=true');
        if (cached) {
          const lista = Array.isArray(cached.data) ? cached.data : cached.data?.productos ?? cached.data?.data ?? [];
          setProductos(lista);
          setOffline(true);
          setTs(cached.ts);
        }
      });
  }, []);

  const filtrados = useMemo(() => {
    if (!productos) return [];
    const q = filtro.toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.referencia?.toLowerCase().includes(q) ||
      p.material?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q)
    );
  }, [productos, filtro]);

  return (
    <div className="flex flex-col min-h-screen max-w-sm mx-auto w-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-base-200 bg-base-100 sticky top-0 z-10">
        <Link href="/movil" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <p className="font-semibold text-sm leading-none">Productos</p>
          {offline && ts && (
            <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
              <WifiOff className="w-3 h-3" /> Sin red · {new Date(ts).toLocaleDateString('es-ES')}
            </p>
          )}
        </div>
        {productos && (
          <span className="badge badge-ghost badge-sm">{filtrados.length}</span>
        )}
      </div>

      {/* Buscador */}
      <div className="px-4 py-2 border-b border-base-200 bg-base-100 sticky top-12 z-10">
        <label className="input input-bordered input-sm flex items-center gap-2 w-full">
          <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
          <input
            type="text"
            className="grow"
            placeholder="Buscar por nombre, referencia…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
          />
        </label>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto divide-y divide-base-200">
        {!productos && (
          <div className="flex justify-center py-10"><span className="loading loading-spinner" /></div>
        )}
        {productos && filtrados.length === 0 && (
          <p className="text-center text-base-content/40 py-10 text-sm">Sin resultados</p>
        )}
        {filtrados.map((p, i) => (
          <div key={p.id ?? i} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug truncate">{p.nombre}</p>
              <div className="flex gap-2 flex-wrap mt-0.5">
                {p.referencia && (
                  <span className="text-xs font-mono text-base-content/50">{p.referencia}</span>
                )}
                {p.material && (
                  <span className="badge badge-outline badge-xs">{p.material}</span>
                )}
                {p.espesor && (
                  <span className="badge badge-ghost badge-xs">{p.espesor} mm</span>
                )}
              </div>
              {p.descripcion && (
                <p className="text-xs text-base-content/40 mt-0.5 line-clamp-1">{p.descripcion}</p>
              )}
            </div>
            {p.precioUnitario != null && p.precioUnitario !== 0 && (
              <div className="text-right shrink-0">
                <p className="font-bold font-mono text-sm">{Number(p.precioUnitario).toFixed(2)} €</p>
                {p.unidad && <p className="text-xs text-base-content/40">/{p.unidad}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
