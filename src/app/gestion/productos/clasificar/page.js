"use client";
import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { ArrowLeft, Layers, CheckSquare, X, Zap } from 'lucide-react';
import SelectorFamiliaSubfamilia from '@/componentes/productos/SelectorFamiliaSubfamilia';
import { ContenedorCargando } from '@/componentes/ui';

export default function ClasificarPage() {
  const { data, isLoading, error } = useSWR('/api/productos?page=1&limit=500');
  const { data: familias = [] } = useSWR('/api/familias');
  const productos = data?.data ?? [];

  const [modo, setModo] = useState('sello'); // 'sello' | 'seleccion'
  const [subfamiliaId, setSubfamiliaId] = useState(null);
  const [soloSinClasificar, setSoloSinClasificar] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroFamilia, setFiltroFamilia] = useState('');
  const [seleccion, setSeleccion] = useState(new Set());
  const [procesando, setProcesando] = useState(new Set());
  const [asignadosHoy, setAsignadosHoy] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter(p => {
      if (q &&
        !p.nombre?.toLowerCase().includes(q) &&
        !(p.subfamilia?.nombre ?? '').toLowerCase().includes(q) &&
        !(p.material?.nombre ?? '').toLowerCase().includes(q)) return false;
      if (filtroFamilia && p.subfamilia?.familia?.id !== filtroFamilia) return false;
      if (soloSinClasificar && p.subfamilia != null) return false;
      return true;
    });
  }, [productos, busqueda, filtroFamilia, soloSinClasificar]);

  const sinClasificarTotal = useMemo(
    () => productos.filter(p => p.subfamilia == null).length,
    [productos]
  );

  async function asignarProductos(ids) {
    if (!subfamiliaId) { setErrorMsg('Selecciona una subfamilia primero'); return; }
    const arr = [...ids];
    setErrorMsg(null);
    setProcesando(prev => new Set([...prev, ...arr]));
    try {
      const resultados = await Promise.all(
        arr.map(id =>
          fetch(`/api/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subfamiliaId }),
          })
        )
      );
      const fallidos = resultados.filter(r => !r.ok).length;
      if (fallidos > 0) throw new Error(`${fallidos} producto(s) no se pudieron actualizar`);
      setAsignadosHoy(n => n + arr.length);
      setSeleccion(new Set());
      mutate('/api/productos?page=1&limit=500');
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setProcesando(prev => {
        const next = new Set(prev);
        arr.forEach(id => next.delete(id));
        return next;
      });
    }
  }

  function toggleSeleccion(id) {
    setSeleccion(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (seleccion.size === filtrados.length) {
      setSeleccion(new Set());
    } else {
      setSeleccion(new Set(filtrados.map(p => p.id)));
    }
  }

  const todosMarcados = filtrados.length > 0 && seleccion.size === filtrados.length;
  const algunoMarcado = seleccion.size > 0 && seleccion.size < filtrados.length;

  return (
    <div className={`container mx-auto p-4 max-w-5xl ${modo === 'seleccion' && seleccion.size > 0 ? 'pb-24' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestion/productos" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6" /> Clasificación masiva
          </h1>
          <p className="text-sm text-base-content/50">
            {sinClasificarTotal} sin clasificar
            {asignadosHoy > 0 && <span className="text-success ml-2">· {asignadosHoy} asignados esta sesión</span>}
          </p>
        </div>
      </div>

      {/* Panel de sello */}
      <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
        <div className="card-body p-4 gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-72">
              <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
                Subfamilia destino
              </p>
              <SelectorFamiliaSubfamilia
                value={subfamiliaId}
                onChange={setSubfamiliaId}
                compact
              />
            </div>

            <div className="join shrink-0">
              <button
                className={`btn btn-sm join-item gap-1 ${modo === 'sello' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                onClick={() => { setModo('sello'); setSeleccion(new Set()); }}
              >
                <Zap className="w-3.5 h-3.5" /> Click rápido
              </button>
              <button
                className={`btn btn-sm join-item gap-1 ${modo === 'seleccion' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                onClick={() => setModo('seleccion')}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Selección
              </button>
            </div>
          </div>

          <p className="text-xs text-base-content/40">
            {modo === 'sello'
              ? 'Selecciona la subfamilia arriba y haz clic en cualquier producto para asignarlo al instante.'
              : 'Marca los productos con los checkboxes y pulsa "Asignar" en el panel inferior.'}
          </p>

          {errorMsg && <p className="text-error text-sm">{errorMsg}</p>}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <button
          className={`btn btn-sm ${soloSinClasificar ? 'btn-warning' : 'btn-outline btn-warning'}`}
          onClick={() => { setSoloSinClasificar(v => !v); setFiltroFamilia(''); }}
        >
          Sin clasificar
        </button>
        <select
          className="select select-bordered select-sm"
          value={filtroFamilia}
          onChange={e => { setFiltroFamilia(e.target.value); setSoloSinClasificar(false); }}
        >
          <option value="">Todas las familias</option>
          {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="input input-bordered input-sm w-full pr-8"
          />
          {busqueda && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
              onClick={() => setBusqueda('')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <span className="text-sm text-base-content/40 shrink-0">{filtrados.length} productos</span>
      </div>

      {/* Tabla */}
      <ContenedorCargando isLoading={isLoading} error={error}>
        <div className="card bg-base-100 shadow-xl overflow-x-auto">
          <table className="table table-sm table-zebra w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-base-content/50">
                {modo === 'seleccion' && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={todosMarcados}
                      ref={el => { if (el) el.indeterminate = algunoMarcado; }}
                      onChange={toggleTodos}
                    />
                  </th>
                )}
                <th>Producto</th>
                <th>Clasificación actual</th>
                <th>Material</th>
                {modo === 'sello' && <th className="w-28 text-center">Estado</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={modo === 'seleccion' ? 4 : 4} className="text-center py-16 text-base-content/30">
                    {soloSinClasificar
                      ? '¡Todos los productos están clasificados!'
                      : 'No hay productos con ese filtro'}
                  </td>
                </tr>
              )}
              {filtrados.map(p => {
                const enProceso = procesando.has(p.id);
                const marcado = seleccion.has(p.id);
                return (
                  <tr
                    key={p.id}
                    className={[
                      modo === 'sello' && !enProceso && subfamiliaId ? 'hover cursor-pointer' : '',
                      marcado ? 'bg-primary/10' : '',
                      enProceso ? 'opacity-50' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={
                      modo === 'sello' && !enProceso
                        ? () => asignarProductos([p.id])
                        : modo === 'seleccion'
                        ? () => toggleSeleccion(p.id)
                        : undefined
                    }
                  >
                    {modo === 'seleccion' && (
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={marcado}
                          onChange={() => toggleSeleccion(p.id)}
                        />
                      </td>
                    )}
                    <td className="font-medium">{p.nombre}</td>
                    <td>
                      {p.subfamilia ? (
                        <span
                          className="badge badge-sm font-medium"
                          style={p.subfamilia.familia?.color ? {
                            backgroundColor: p.subfamilia.familia.color + '22',
                            color: p.subfamilia.familia.color,
                            borderColor: p.subfamilia.familia.color + '55',
                          } : {}}
                        >
                          {p.subfamilia.familia?.nombre} / {p.subfamilia.nombre}
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm text-base-content/40">Sin clasificar</span>
                      )}
                    </td>
                    <td className="text-sm text-base-content/50">{p.material?.nombre ?? '—'}</td>
                    {modo === 'sello' && (
                      <td className="text-center">
                        {enProceso
                          ? <span className="loading loading-spinner loading-xs text-primary" />
                          : subfamiliaId
                          ? <span className="text-xs text-base-content/25">← clic para asignar</span>
                          : <span className="text-xs text-warning/60">↑ elige subfamilia</span>
                        }
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ContenedorCargando>

      {/* Panel batch (modo seleccion) */}
      {modo === 'seleccion' && seleccion.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-base-100 border-t-2 border-primary shadow-2xl px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <span className="font-medium text-primary flex items-center gap-2 shrink-0">
              <CheckSquare className="w-5 h-5" />
              {seleccion.size} producto{seleccion.size !== 1 ? 's' : ''} seleccionado{seleccion.size !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={() => asignarProductos([...seleccion])}
              disabled={!subfamiliaId || procesando.size > 0}
            >
              {procesando.size > 0
                ? <span className="loading loading-spinner loading-xs" />
                : <Layers className="w-4 h-4" />}
              Asignar {seleccion.size}
            </button>
            {!subfamiliaId && (
              <span className="text-sm text-warning">Selecciona una subfamilia destino arriba</span>
            )}
            <button
              className="btn btn-ghost btn-sm btn-square ml-auto"
              onClick={() => setSeleccion(new Set())}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
