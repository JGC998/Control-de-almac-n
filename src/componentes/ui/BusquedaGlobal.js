'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Search, User, Package, FileText, X, ArrowRight, Receipt } from 'lucide-react';

const TYPE_CONFIG = {
  cliente:      { label: 'Cliente',      icon: User,     color: 'text-blue-500',   getPath: r => `/gestion/clientes/${r.id}`,  getText: r => r.nombre, getSub: r => r.email },
  producto:     { label: 'Producto',     icon: Package,  color: 'text-green-500',  getPath: r => `/gestion/productos`,         getText: r => r.nombre, getSub: r => r.referencia },
  pedido:       { label: 'Pedido',       icon: Package,  color: 'text-purple-500', getPath: r => `/pedidos/${r.id}`,           getText: r => r.numero, getSub: r => r.clienteNombre },
  presupuesto:  { label: 'Presupuesto',  icon: FileText, color: 'text-amber-500',  getPath: r => `/presupuestos/${r.id}`,      getText: r => r.numero, getSub: r => r.clienteNombre },
};

const GRUPOS_ORDEN = ['cliente', 'pedido', 'presupuesto', 'producto'];

function agrupar(results = []) {
  const grupos = {};
  for (const r of results) {
    if (!grupos[r.type]) grupos[r.type] = [];
    grupos[r.type].push(r);
  }
  return grupos;
}

export default function BusquedaGlobal({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounce: esperar 250ms tras el último carácter antes de enviar al servidor
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const queryUrl = debouncedQuery.trim().length >= 2 ? `/api/busqueda?q=${encodeURIComponent(debouncedQuery.trim())}` : null;
  const { data: results = [], isLoading, error: searchError } = useSWR(queryUrl, {
    revalidateOnFocus: false,
    dedupingInterval: 300,
    shouldRetryOnError: false,
  });

  // Flatten para navegación por teclado (memoizado para evitar re-suscripciones al keydown)
  const flatResults = useMemo(
    () => (results ?? []).map(r => ({ ...r, path: TYPE_CONFIG[r.type]?.getPath(r) })).filter(r => r.path),
    [results]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(-1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setCursor(-1); }, [query]);

  const navigate = useCallback((path) => {
    router.push(path);
    onClose();
    setQuery('');
  }, [router, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(p => Math.min(p + 1, flatResults.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(p => Math.max(p - 1, -1));
      }
      if (e.key === 'Enter' && cursor >= 0 && flatResults[cursor]) {
        navigate(flatResults[cursor].path);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, flatResults, navigate, onClose]);

  // Scroll al item activo
  useEffect(() => {
    if (cursor < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  const grupos = agrupar(results);
  const hayResultados = results.length > 0;

  // Mapa cursor → idx
  let flatIdx = 0;
  const renderGrupos = GRUPOS_ORDEN.filter(t => grupos[t]?.length).map(tipo => {
    const cfg = TYPE_CONFIG[tipo];
    const Icon = cfg.icon;
    const items = grupos[tipo].map(r => {
      const idx = flatIdx++;
      return { r, idx };
    });
    return { tipo, cfg, Icon, items };
  });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl mx-4 bg-base-100 rounded-2xl shadow-2xl border border-base-200 overflow-hidden flex flex-col max-h-[70vh]">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-200">
          <Search className="w-5 h-5 text-base-content/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Búsqueda global"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-base-content/30"
            placeholder="Buscar clientes, pedidos, presupuestos, productos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setQuery('')}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="kbd kbd-sm hidden sm:inline-flex">Esc</kbd>
        </div>

        {/* Resultados */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          )}

          {!isLoading && searchError && (
            <div className="py-8 text-center text-error text-sm">
              Error al buscar. Inténtalo de nuevo.
            </div>
          )}

          {!isLoading && !searchError && query.length >= 2 && !hayResultados && (
            <div className="py-10 text-center text-base-content/40 text-sm">
              Sin resultados para <span className="font-medium text-base-content/70">&quot;{query}&quot;</span>
            </div>
          )}

          {!isLoading && query.length < 2 && (
            <div className="py-8 text-center text-base-content/30 text-sm">
              Escribe al menos 2 caracteres para buscar
            </div>
          )}

          {!isLoading && !searchError && hayResultados && renderGrupos.map(({ tipo, cfg, Icon, items }) => (
            <div key={tipo}>
              <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-base-content/40 bg-base-200/40">
                {cfg.label}s — {items.length} resultado{items.length !== 1 ? 's' : ''}
              </div>
              {items.map(({ r, idx }) => (
                <button
                  key={`${r.type}-${r.id}`}
                  data-idx={idx}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${cursor === idx ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'}`}
                  onClick={() => navigate(cfg.getPath(r))}
                  onMouseEnter={() => setCursor(idx)}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${cursor === idx ? 'text-primary' : cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{cfg.getText(r)}</div>
                    {cfg.getSub(r) && (
                      <div className="text-xs text-base-content/50 truncate">{cfg.getSub(r)}</div>
                    )}
                  </div>
                  {r.total != null && (
                    <span className="text-xs font-mono text-base-content/50 shrink-0">
                      {r.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                  )}
                  {r.estado && (
                    <span className="badge badge-xs badge-ghost shrink-0">{r.estado}</span>
                  )}
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${cursor === idx ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-base-200 flex items-center gap-4 text-[11px] text-base-content/30">
          <span><kbd className="kbd kbd-xs">↑↓</kbd> navegar</span>
          <span><kbd className="kbd kbd-xs">Enter</kbd> abrir</span>
          <span><kbd className="kbd kbd-xs">Esc</kbd> cerrar</span>
          {hayResultados && <span className="ml-auto">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  );
}
