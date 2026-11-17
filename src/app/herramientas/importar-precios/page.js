"use client";
import React, { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Check, Search, ArrowRight, SkipForward, Tag, Info, PlusCircle } from 'lucide-react';

export default function ImportarPreciosPage() {
  const { data, isLoading, error } = useSWR('/api/herramientas/import-preview', fetcher);

  // Filtros candidatos
  const [familia, setFamilia]     = useState('');
  const [busqueda, setBusqueda]   = useState('');
  const [soloSinPVP, setSoloSinPVP] = useState(false);

  // Candidato seleccionado
  const [seleccionado, setSeleccionado] = useState(null);

  // Búsqueda en productos existentes
  const [busqDB, setBusqDB] = useState('');

  // Mapa de procesados: candidatoId → { estado: 'actualizado'|'omitido', productoId?, nombre? }
  const [procesados, setProcesados] = useState({});

  // Estado de operación
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Formulario de creación editable
  const [modoCrear, setModoCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({});

  const candidatos = data?.candidatos || [];
  const productos  = data?.productos  || [];

  const familias = useMemo(() =>
    [...new Set(candidatos.map(c => c.familia))].sort(),
  [candidatos]);

  const candidatosFiltrados = useMemo(() => {
    return candidatos.filter(c => {
      if (familia && c.familia !== familia) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!c.nombre.toLowerCase().includes(q) && !c.material.toLowerCase().includes(q)) return false;
      }
      if (soloSinPVP) return !procesados[c.id];
      return true;
    });
  }, [candidatos, familia, busqueda, soloSinPVP, procesados]);

  const productosFiltrados = useMemo(() => {
    if (!busqDB) return [];
    const q = busqDB.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      (p.material?.nombre || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [productos, busqDB]);

  const stats = useMemo(() => {
    const total = candidatos.length;
    const actualizados = Object.values(procesados).filter(p => p.estado === 'actualizado').length;
    const omitidos     = Object.values(procesados).filter(p => p.estado === 'omitido').length;
    const pendientes   = total - actualizados - omitidos;
    return { total, actualizados, omitidos, pendientes };
  }, [candidatos, procesados]);

  const handleSeleccionar = (c) => {
    setSeleccionado(c);
    setModoCrear(false);
    const palabras = c.nombre.split(' ').slice(0, 3).join(' ');
    setBusqDB(palabras);
  };

  const avanzarSiguiente = useCallback((candidatoIdProcesado, nuevosProcessados) => {
    const idx = candidatosFiltrados.findIndex(c => c.id === candidatoIdProcesado);
    const siguiente = candidatosFiltrados.slice(idx + 1).find(c => !nuevosProcessados[c.id]);
    if (siguiente) handleSeleccionar(siguiente);
    else setSeleccionado(null);
  }, [candidatosFiltrados]);

  const handleActualizar = useCallback(async (productoId, productoNombre) => {
    if (!seleccionado) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/herramientas/import-preview/fundir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId,
          pvpNuevo:  seleccionado.pvp,
          udsNuevas: seleccionado.uds,
          accion: 'actualizar',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');

      const nuevos = { ...procesados, [seleccionado.id]: { estado: 'actualizado', productoId, nombre: productoNombre } };
      setProcesados(nuevos);
      setMensaje({ tipo: 'ok', texto: `✓ ${productoNombre} actualizado a ${seleccionado.pvp.toFixed(2)} €` });
      avanzarSiguiente(seleccionado.id, nuevos);

    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  }, [seleccionado, procesados, avanzarSiguiente]);

  const abrirFormCrear = useCallback(() => {
    if (!seleccionado) return;
    setFormCrear({
      nombre: seleccionado.nombre,
      espesor: seleccionado.espesor ?? '',
      ancho:   seleccionado.ancho   ?? '',
      largo:   seleccionado.largo   ?? '',
      pvp:     seleccionado.pvp,
      uds:     seleccionado.uds,
    });
    setModoCrear(true);
  }, [seleccionado]);

  const handleCrear = useCallback(async () => {
    if (!seleccionado) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/herramientas/import-preview/fundir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'crear',
          nombre:           formCrear.nombre,
          espesor:          formCrear.espesor !== '' ? Number(formCrear.espesor) : null,
          ancho:            formCrear.ancho   !== '' ? Number(formCrear.ancho)   : null,
          largo:            formCrear.largo   !== '' ? Number(formCrear.largo)   : null,
          pvpNuevo:         Number(formCrear.pvp),
          udsNuevas:        Number(formCrear.uds),
          materialNombre:   seleccionado.material,
          fabricanteNombre: seleccionado.familia,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');

      const nuevos = { ...procesados, [seleccionado.id]: { estado: 'actualizado', productoId: json.producto.id, nombre: json.producto.nombre } };
      setProcesados(nuevos);
      setMensaje({ tipo: 'ok', texto: `✓ Producto creado: ${json.producto.nombre}` });
      setModoCrear(false);
      avanzarSiguiente(seleccionado.id, nuevos);

    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  }, [seleccionado, formCrear, procesados, avanzarSiguiente]);

  const handleOmitir = useCallback(() => {
    if (!seleccionado) return;
    const nuevos = { ...procesados, [seleccionado.id]: { estado: 'omitido' } };
    setProcesados(nuevos);
    avanzarSiguiente(seleccionado.id, nuevos);
  }, [seleccionado, procesados, avanzarSiguiente]);

  const fmtDims = (c) => {
    const p = [];
    if (c.espesor) p.push(`${c.espesor}mm esp`);
    if (c.ancho)   p.push(`${c.ancho}mm ancho`);
    if (c.largo)   p.push(`${c.largo}mm largo`);
    return p.join(' · ') || '—';
  };

  const estadoBadge = (c) => {
    const p = procesados[c.id];
    if (!p) return null;
    if (p.estado === 'actualizado') return <span className="badge badge-success badge-xs">✓</span>;
    if (p.estado === 'omitido')     return <span className="badge badge-ghost badge-xs">—</span>;
    return null;
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );

  if (error) return (
    <div className="alert alert-error m-8">Error al cargar datos: {error.message}</div>
  );

  return (
    <div className="p-4 max-w-[1600px] mx-auto space-y-4">

      {/* Cabecera */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Importar precios de venta</h1>
          <p className="text-sm opacity-60">Vincula productos del catálogo de facturación con los de la web y actualiza su precio de venta.</p>
        </div>
        <div className="flex gap-3">
          <div className="stat bg-base-200 rounded-box px-4 py-2">
            <div className="stat-title text-xs">Pendientes</div>
            <div className="stat-value text-lg text-warning">{stats.pendientes}</div>
          </div>
          <div className="stat bg-base-200 rounded-box px-4 py-2">
            <div className="stat-title text-xs">Actualizados</div>
            <div className="stat-value text-lg text-success">{stats.actualizados}</div>
          </div>
          <div className="stat bg-base-200 rounded-box px-4 py-2">
            <div className="stat-title text-xs">Total CSV</div>
            <div className="stat-value text-lg">{stats.total}</div>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'ok' ? 'alert-success' : 'alert-error'} py-2`}>
          {mensaje.texto}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="select select-bordered select-sm"
          value={familia}
          onChange={e => setFamilia(e.target.value)}
        >
          <option value="">Todas las familias ({candidatos.length})</option>
          {familias.map(f => (
            <option key={f} value={f}>
              {f} ({candidatos.filter(c => c.familia === f).length})
            </option>
          ))}
        </select>

        <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-48">
          <Search size={14} className="opacity-50" />
          <input
            type="text"
            placeholder="Buscar en candidatos…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="grow"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={soloSinPVP}
            onChange={e => setSoloSinPVP(e.target.checked)}
          />
          Solo pendientes
        </label>
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Panel izquierdo: Candidatos ── */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-3">
            <h2 className="card-title text-base mb-2">
              Candidatos del catálogo de facturación
              <span className="badge badge-neutral badge-sm">{candidatosFiltrados.length}</span>
            </h2>
            <div className="overflow-y-auto max-h-[60vh] space-y-1 pr-1">
              {candidatosFiltrados.length === 0 && (
                <p className="text-sm opacity-50 py-8 text-center">Sin candidatos con estos filtros</p>
              )}
              {candidatosFiltrados.map(c => {
                const proc = procesados[c.id];
                const isSelected = seleccionado?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSeleccionar(c)}
                    className={`
                      p-2 rounded-lg cursor-pointer transition-all border
                      ${isSelected ? 'bg-primary/10 border-primary' :
                        proc?.estado === 'actualizado' ? 'bg-success/10 border-success/40' :
                        proc?.estado === 'omitido' ? 'bg-base-200 border-transparent opacity-40' :
                        'bg-base-100 border-transparent hover:border-base-300'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight truncate ${proc?.estado === 'actualizado' ? 'text-success' : ''}`}>
                          {proc?.estado === 'actualizado' && <Check size={12} className="inline mr-1" />}
                          {c.nombre}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs opacity-50">{c.familia}</span>
                          {c.material && <span className="text-xs text-primary/70">{c.material}</span>}
                          {(c.espesor || c.ancho || c.largo) && (
                            <span className="text-xs opacity-50">{fmtDims(c)}</span>
                          )}
                        </div>
                        {proc?.estado === 'actualizado' && proc.nombre && (
                          <p className="text-xs text-success/70 truncate mt-0.5">→ {proc.nombre}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono text-sm font-bold text-success">
                          {c.pvp.toFixed(2)} €
                        </span>
                        {!proc && c.sugerencia && (
                          <span className="badge badge-info badge-xs">match {c.sugerencia.score}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Panel derecho: Acción ── */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-3">
            {!seleccionado ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-40 text-center">
                <ArrowRight size={40} className="mb-3" />
                <p>Selecciona un candidato de la izquierda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Candidato seleccionado */}
                <div>
                  <h2 className="card-title text-base mb-1">Candidato seleccionado</h2>
                  <div className="bg-base-100 rounded-lg p-3 space-y-1">
                    <p className="font-semibold leading-snug">{seleccionado.nombre}</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="badge badge-outline">{seleccionado.familia}</span>
                      {seleccionado.material && <span className="badge badge-outline badge-info">{seleccionado.material}</span>}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm">
                      {seleccionado.espesor && <span><b>Esp:</b> {seleccionado.espesor}mm</span>}
                      {seleccionado.ancho && <span><b>A:</b> {seleccionado.ancho}mm</span>}
                      {seleccionado.largo && <span><b>L:</b> {seleccionado.largo}mm</span>}
                    </div>
                    <div className="flex gap-4 text-sm mt-1">
                      <span className="text-success font-bold">PVP nuevo: {seleccionado.pvp.toFixed(2)} €</span>
                      <span className="opacity-60">Uds vendidas: {seleccionado.uds}</span>
                    </div>
                  </div>
                </div>

                {/* Sugerencia automática */}
                {seleccionado.sugerencia && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag size={14} className="text-info" />
                      <span className="text-sm font-medium text-info">
                        Sugerencia automática (score: {seleccionado.sugerencia.score}%)
                      </span>
                    </div>
                    <div className="bg-info/10 border border-info/30 rounded-lg p-3">
                      <p className="font-medium text-sm">{seleccionado.sugerencia.nombre}</p>
                      <div className="flex gap-4 text-xs mt-1 opacity-70">
                        {seleccionado.sugerencia.espesor != null && <span>Esp: {seleccionado.sugerencia.espesor}mm</span>}
                        {seleccionado.sugerencia.ancho != null && <span>A: {seleccionado.sugerencia.ancho}mm</span>}
                        {seleccionado.sugerencia.largo != null && <span>L: {seleccionado.sugerencia.largo}mm</span>}
                        {seleccionado.sugerencia.material && <span>{seleccionado.sugerencia.material}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm opacity-60">PVP actual: {(seleccionado.sugerencia.precioVenta||0).toFixed(2)} €</span>
                        <button
                          className="btn btn-info btn-sm gap-1"
                          onClick={() => handleActualizar(seleccionado.sugerencia.id, seleccionado.sugerencia.nombre)}
                          disabled={guardando}
                        >
                          {guardando ? <span className="loading loading-spinner loading-xs" /> : <Check size={14} />}
                          Actualizar este
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Búsqueda manual */}
                <div>
                  <p className="text-sm font-medium mb-1">O busca manualmente en los productos de la web:</p>
                  <label className="input input-bordered input-sm flex items-center gap-2">
                    <Search size={14} className="opacity-50" />
                    <input
                      type="text"
                      placeholder="Nombre o material del producto…"
                      value={busqDB}
                      onChange={e => setBusqDB(e.target.value)}
                      className="grow"
                      autoFocus
                    />
                    {busqDB && (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setBusqDB('')}
                      >×</button>
                    )}
                  </label>

                  {busqDB && (
                    <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                      {productosFiltrados.length === 0 && (
                        <p className="text-xs opacity-40 py-2 text-center">Sin resultados</p>
                      )}
                      {productosFiltrados.map(p => (
                        <div
                          key={p.id}
                          className="bg-base-100 rounded p-2 hover:bg-primary/10 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.nombre}</p>
                              <div className="flex gap-2 text-xs opacity-50">
                                {p.material?.nombre && <span>{p.material.nombre}</span>}
                                {p.espesor != null && <span>{p.espesor}mm esp</span>}
                                {p.ancho != null && <span>{p.ancho}mm A</span>}
                                {p.largo != null && <span>{p.largo}mm L</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs opacity-50 font-mono">
                                {(p.precioVenta||0).toFixed(2)} €
                              </span>
                              <button
                                className="btn btn-primary btn-xs gap-1"
                                onClick={() => handleActualizar(p.id, p.nombre)}
                                disabled={guardando}
                              >
                                {guardando
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <Check size={12} />
                                }
                                Usar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Crear como nuevo */}
                <div className="border-t border-base-300 pt-3">
                  <p className="text-xs opacity-50 mb-2">¿No encuentras el producto en la web? Créalo directamente:</p>

                  {!modoCrear ? (
                    <button
                      className="btn btn-outline btn-success btn-sm gap-1 w-full"
                      onClick={abrirFormCrear}
                      disabled={guardando}
                    >
                      <PlusCircle size={14} />
                      Crear como nuevo producto
                    </button>
                  ) : (
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-success">Nuevo producto — revisa los datos antes de crear</p>

                      <div>
                        <label className="text-xs opacity-60">Nombre</label>
                        <input
                          className="input input-bordered input-xs w-full mt-0.5"
                          value={formCrear.nombre}
                          onChange={e => setFormCrear(f => ({ ...f, nombre: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'espesor', label: 'Esp (mm)' },
                          { key: 'ancho',   label: 'Ancho (mm)' },
                          { key: 'largo',   label: 'Largo (mm)' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-xs opacity-60">{label}</label>
                            <input
                              type="number"
                              className="input input-bordered input-xs w-full mt-0.5"
                              value={formCrear[key]}
                              placeholder="—"
                              onChange={e => setFormCrear(f => ({ ...f, [key]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs opacity-60">PVP (€)</label>
                          <input
                            type="number"
                            className="input input-bordered input-xs w-full mt-0.5"
                            value={formCrear.pvp}
                            onChange={e => setFormCrear(f => ({ ...f, pvp: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs opacity-60">Uds vendidas</label>
                          <input
                            type="number"
                            className="input input-bordered input-xs w-full mt-0.5"
                            value={formCrear.uds}
                            onChange={e => setFormCrear(f => ({ ...f, uds: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          className="btn btn-success btn-sm gap-1 flex-1"
                          onClick={handleCrear}
                          disabled={guardando || !formCrear.nombre}
                        >
                          {guardando
                            ? <span className="loading loading-spinner loading-xs" />
                            : <Check size={14} />
                          }
                          Confirmar creación
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setModoCrear(false)}
                          disabled={guardando}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón omitir */}
                <div className="flex justify-end">
                  <button
                    className="btn btn-ghost btn-sm gap-1 opacity-60"
                    onClick={handleOmitir}
                  >
                    <SkipForward size={14} />
                    Omitir este candidato
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Nota informativa */}
      <div className="alert alert-info py-2 text-sm">
        <Info size={16} />
        <span>
          Al pulsar <b>"Actualizar"</b> se sobreescribe el <b>precio de venta</b> y las <b>unidades vendidas</b> del producto en la BD.
          No se modifica el coste ni ningún otro campo.
        </span>
      </div>
    </div>
  );
}
