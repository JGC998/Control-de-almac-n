"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Link2, Plus, Pencil, Trash2, Save, X, Settings, History, Package, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';
import { toastError } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';

const TIPO_LABELS = { NORMAL: 'Normal', UNA: 'Uña' };
const TIPO_BADGE  = { NORMAL: 'badge-primary', UNA: 'badge-secondary' };

function espesorLabel(modelo) {
  if (modelo.tipo === 'UNA') return `${modelo.espesorDesde} mm`;
  return `${modelo.espesorDesde} – ${modelo.espesorHasta ?? '?'} mm`;
}

const FORM_VACIO = { tipo: 'NORMAL', nombre: '', espesorDesde: '', espesorHasta: '', anchosDisponibles: '', precioPor100mm: '' };

function HistorialGrapa({ modeloId }) {
  const { data: historial, isLoading } = useSWR(`/api/modelos-grapa/${modeloId}/historial`);
  const fmt4 = (v) => v?.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return (
    <div className="mt-3 rounded-lg border border-base-300 bg-base-50 px-4 py-3">
      <h4 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <History className="w-3 h-3" /> Historial de precios
      </h4>
      {isLoading ? (
        <span className="loading loading-spinner loading-xs" />
      ) : !historial || historial.length === 0 ? (
        <p className="text-xs text-base-content/40">Sin cambios registrados. Los cambios se graban al guardar una importación con este modelo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-xs w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Precio anterior</th>
                <th>Precio nuevo</th>
                <th>Ancho (mm)</th>
                <th>Pares/caja</th>
                <th>Coste/caja (€)</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td className="text-xs">{new Date(h.creadoEn).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="font-mono text-xs text-base-content/50">{fmt4(h.precioPor100mmAnterior)} €</td>
                  <td className="font-mono text-xs font-semibold">{fmt4(h.precioPor100mmNuevo)} €</td>
                  <td className="font-mono text-xs">{h.anchoPar}</td>
                  <td className="font-mono text-xs">{h.paresPorCaja}</td>
                  <td className="font-mono text-xs">{h.costePorCaja?.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SeccionModelosGenericos() {
  const { data, isLoading, error } = useSWR('/api/modelos-grapa');
  const modelos = data?.modelos ?? [];
  const mermaInicial = data?.mermaGrapaPct ?? 20;

  const [merma, setMerma] = useState('');
  const [guardandoMerma, setGuardandoMerma] = useState(false);
  const [mermaGuardada, setMermaGuardada] = useState(false);
  const mermaValor = merma !== '' ? merma : mermaInicial;

  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [historialAbierto, setHistorialAbierto] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [resultadoGen, setResultadoGen] = useState(null);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const handleGenerarProductos = async () => {
    setGenerando(true);
    setResultadoGen(null);
    try {
      const res = await fetch('/api/modelos-grapa/generar-productos', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Error al generar');
      setResultadoGen(data);
    } catch (err) {
      toastError('Error al generar productos de grapa: ' + err.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleGuardarMerma = async () => {
    setGuardandoMerma(true);
    try {
      const res = await fetch('/api/modelos-grapa/config-merma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaGrapaPct: parseFloat(mermaValor) }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/modelos-grapa');
      setMermaGuardada(true);
      setTimeout(() => setMermaGuardada(false), 2500);
    } catch (e) {
      toastError('Error al guardar: ' + e.message);
    } finally {
      setGuardandoMerma(false);
    }
  };

  const abrirNuevo = () => { setForm(FORM_VACIO); setEditandoId(null); setErrMsg(''); setMostrarForm(true); };
  const abrirEditar = (m) => {
    setForm({
      tipo: m.tipo,
      nombre: m.nombre,
      espesorDesde: String(m.espesorDesde),
      espesorHasta: m.espesorHasta != null ? String(m.espesorHasta) : '',
      anchosDisponibles: Array.isArray(m.anchosDisponibles) ? m.anchosDisponibles.join(', ') : '',
      precioPor100mm: String(m.precioPor100mm),
    });
    setEditandoId(m.id);
    setErrMsg('');
    setMostrarForm(true);
  };
  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setErrMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrMsg('');
    const anchosArr = form.anchosDisponibles
      ? form.anchosDisponibles.split(',').map(s => parseFloat(s.trim())).filter(n => n > 0)
      : null;
    const payload = {
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      espesorDesde: parseFloat(form.espesorDesde),
      espesorHasta: form.tipo === 'UNA' ? null : (form.espesorHasta !== '' ? parseFloat(form.espesorHasta) : null),
      anchosDisponibles: anchosArr && anchosArr.length > 0 ? anchosArr : null,
      precioPor100mm: parseFloat(form.precioPor100mm) || 0,
    };
    try {
      const url = editandoId ? `/api/modelos-grapa/${editandoId}` : '/api/modelos-grapa';
      const method = editandoId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      await mutate('/api/modelos-grapa');
      cerrarForm();
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    const ok = await confirmar({ titulo: '¿Eliminar modelo de grapa?' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/modelos-grapa/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/modelos-grapa');
    } catch (e) {
      toastError('Error: ' + e.message);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <ModalConfirmacion />
      <div className="card-body">

        {/* Header de sección */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <h2 className="card-title text-base">Modelos genéricos</h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              Define los modelos por rango de espesor con su precio €/100mm. La calculadora de bandas los usa automáticamente.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              className="btn btn-sm btn-ghost gap-1.5"
              onClick={handleGenerarProductos}
              disabled={generando}
              title="Crea o actualiza un Producto por cada modelo × ancho. Solo sube el precio, nunca lo baja."
            >
              <Package className={`w-4 h-4 ${generando ? 'animate-pulse' : ''}`} />
              {generando ? 'Generando…' : 'Generar productos'}
            </button>
            <button className="btn btn-sm btn-primary gap-1" onClick={abrirNuevo}>
              <Plus className="w-4 h-4" /> Añadir modelo
            </button>
          </div>
        </div>

        {resultadoGen && (
          <div className="alert alert-info py-2 text-sm mb-3">
            <span>
              <strong>{resultadoGen.creados} producto(s) nuevo(s)</strong> creados
              {resultadoGen.actualizados > 0 && <>, <strong>{resultadoGen.actualizados} precio(s) subido(s)</strong></>}
              {resultadoGen.omitidos > 0 && <> · {resultadoGen.omitidos} sin anchos (omitidos)</>}
              . Ver en <a href="/gestion/productos" className="link">Catálogo → Productos</a>.
            </span>
            <button className="btn btn-xs btn-ghost ml-auto" onClick={() => setResultadoGen(null)}>✕</button>
          </div>
        )}

        {/* Config merma */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-base-200/60 rounded-lg mb-4 flex-wrap">
          <Settings className="w-4 h-4 text-base-content/40 shrink-0" />
          <span className="text-sm font-medium text-base-content/80">% Merma de grapa</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input input-sm input-bordered w-20 font-mono"
              min={0} max={100} step={1}
              value={mermaValor}
              onChange={e => setMerma(e.target.value)}
            />
            <span className="text-sm text-base-content/50">%</span>
            <button
              className={`btn btn-sm ${mermaGuardada ? 'btn-success' : 'btn-outline'}`}
              onClick={handleGuardarMerma}
              disabled={guardandoMerma}
            >
              {guardandoMerma ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
              {mermaGuardada ? 'Guardado' : 'Guardar'}
            </button>
          </div>
          <span className="text-xs text-base-content/40 ml-auto">Desperdicio por extremo al calcular el coste.</span>
        </div>

        {/* Formulario inline */}
        {mostrarForm && (
          <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">{editandoId ? 'Editar modelo' : 'Nuevo modelo'}</h3>
              <button className="btn btn-xs btn-ghost" onClick={cerrarForm}><X className="w-3.5 h-3.5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Tipo</span></label>
                <select
                  className="select select-bordered select-sm"
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value, espesorHasta: '' }))}
                  required
                >
                  <option value="NORMAL">Normal (rango)</option>
                  <option value="UNA">Uña (espesor exacto)</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Nombre</span></label>
                <input type="text" className="input input-bordered input-sm" placeholder='Ej: 62, 125, HK1'
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs">{form.tipo === 'UNA' ? 'Espesor (mm)' : 'Espesor desde (mm)'}</span>
                </label>
                <input type="number" className="input input-bordered input-sm" placeholder='Ej: 1.5'
                  min={0.1} step={0.1} value={form.espesorDesde}
                  onChange={e => setForm(f => ({ ...f, espesorDesde: e.target.value }))} required />
              </div>
              {form.tipo === 'NORMAL' && (
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Espesor hasta (mm)</span></label>
                  <input type="number" className="input input-bordered input-sm" placeholder='Ej: 3.2'
                    min={0.1} step={0.1} value={form.espesorHasta}
                    onChange={e => setForm(f => ({ ...f, espesorHasta: e.target.value }))} required />
                </div>
              )}
              <div className="form-control col-span-2 md:col-span-1">
                <label className="label py-1">
                  <span className="label-text text-xs">Anchos disponibles (mm)</span>
                  <span className="label-text-alt text-xs opacity-50">separados por coma</span>
                </label>
                <input type="text" className="input input-bordered input-sm"
                  placeholder={form.tipo === 'UNA' ? 'Ej: 800' : 'Ej: 1000, 1200, 1500'}
                  value={form.anchosDisponibles} onChange={e => setForm(f => ({ ...f, anchosDisponibles: e.target.value }))} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Precio €/100mm de par</span></label>
                <input type="number" className="input input-bordered input-sm" placeholder='0.00'
                  min={0} step={0.001} value={form.precioPor100mm}
                  onChange={e => setForm(f => ({ ...f, precioPor100mm: e.target.value }))} required />
              </div>
              <div className="form-control justify-end">
                <div className="flex gap-2 items-end h-full pb-0.5">
                  <button type="submit" className="btn btn-sm btn-primary flex-1" disabled={guardando}>
                    {guardando ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={cerrarForm}>Cancelar</button>
                </div>
              </div>
            </form>
            {errMsg && <p className="text-error text-xs mt-2">{errMsg}</p>}
          </div>
        )}

        {/* Listado de modelos */}
        {isLoading ? (
          <div className="flex justify-center py-10"><span className="loading loading-spinner loading-md" /></div>
        ) : error ? (
          <div role="alert" className="alert alert-error text-sm">Error al cargar los modelos.</div>
        ) : modelos.length === 0 ? (
          <div className="text-center py-10 text-base-content/40 text-sm">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p>No hay modelos configurados. Añade los modelos de grapa que usas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modelos.map(m => (
              <div
                key={m.id}
                className={`bg-base-50 border rounded-xl p-4 flex flex-col gap-2.5 transition-colors ${historialAbierto === m.id ? 'border-primary/40 bg-primary/5' : 'border-base-200 hover:border-base-300'}`}
              >
                {/* Fila superior: badge + nombre + acciones */}
                <div className="flex items-center gap-2">
                  <span className={`badge badge-sm shrink-0 ${TIPO_BADGE[m.tipo] ?? 'badge-ghost'}`}>
                    {TIPO_LABELS[m.tipo] ?? m.tipo}
                  </span>
                  <span className="font-bold text-sm flex-1 truncate">{m.nombre}</span>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => setHistorialAbierto(prev => prev === m.id ? null : m.id)}
                      title="Historial de precios"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn btn-xs btn-ghost" onClick={() => abrirEditar(m)} title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(m.id)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Espesor */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-base-content/40">Espesor</span>
                  <span className="font-mono font-semibold text-sm">{espesorLabel(m)}</span>
                </div>

                {/* Anchos como chips */}
                {Array.isArray(m.anchosDisponibles) && m.anchosDisponibles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {m.anchosDisponibles.map(a => (
                      <span key={a} className="badge badge-ghost badge-sm font-mono">{a} mm</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-base-content/25 italic">Sin anchos definidos</span>
                )}

                {/* Precio */}
                <div className="mt-auto pt-2.5 border-t border-base-200 flex items-center justify-between">
                  <span className="text-xs text-base-content/40">€/100mm par</span>
                  <span className="font-mono font-bold text-base-content">{formatCurrency(m.precioPor100mm)}</span>
                </div>

                {/* Historial expandible */}
                {historialAbierto === m.id && <HistorialGrapa modeloId={m.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const GRAPA_FORM_VACIO = { nombre: '', fabricante: '', descripcion: '', precioMetro: '' };

function SeccionGrapasFabricante() {
  const { data: grapas, isLoading, error } = useSWR('/api/grapas');
  const [form, setForm] = useState(GRAPA_FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const { confirmar, ModalConfirmacion: ModalGrapa } = useConfirmacion();

  const abrirNuevo = () => { setForm(GRAPA_FORM_VACIO); setEditandoId(null); setErrMsg(''); setMostrarForm(true); };
  const abrirEditar = (g) => {
    setForm({ nombre: g.nombre, fabricante: g.fabricante ?? '', descripcion: g.descripcion ?? '', precioMetro: String(g.precioMetro) });
    setEditandoId(g.id); setErrMsg(''); setMostrarForm(true);
  };
  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setErrMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrMsg('');
    const payload = { ...form, precioMetro: parseFloat(form.precioMetro) || 0 };
    try {
      const url = editandoId ? `/api/grapas/${editandoId}` : '/api/grapas';
      const method = editandoId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/grapas');
      cerrarForm();
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    const ok = await confirmar({ titulo: '¿Eliminar esta grapa?' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/grapas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/grapas');
    } catch (e) {
      toastError('Error: ' + e.message);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <ModalGrapa />
      <div className="card-body">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <h2 className="card-title text-base">Referencias de fabricante</h2>
            <p className="text-xs text-base-content/50 mt-0.5">
              Modelos específicos de ANKER, MATO, CHINO… Úsalos como referencia de compra. No afectan al cálculo de precio.
            </p>
          </div>
          <button className="btn btn-sm btn-outline gap-1 shrink-0" onClick={abrirNuevo}>
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>

        {mostrarForm && (
          <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">{editandoId ? 'Editar grapa' : 'Nueva grapa'}</h3>
              <button className="btn btn-xs btn-ghost" onClick={cerrarForm}><X className="w-3.5 h-3.5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Nombre / Modelo</span></label>
                <input type="text" className="input input-bordered input-sm" placeholder='Ej: RS62J47'
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Fabricante</span></label>
                <input type="text" className="input input-bordered input-sm" placeholder='Ej: ANKER'
                  value={form.fabricante} onChange={e => setForm(f => ({ ...f, fabricante: e.target.value }))} />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Precio (€/metro)</span></label>
                <input type="number" className="input input-bordered input-sm" placeholder='0.00' min={0} step={0.01}
                  value={form.precioMetro} onChange={e => setForm(f => ({ ...f, precioMetro: e.target.value }))} required />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Descripción</span></label>
                <input type="text" className="input input-bordered input-sm" placeholder='Opcional'
                  value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <button type="submit" className="btn btn-sm btn-primary" disabled={guardando}>
                  {guardando ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={cerrarForm}>Cancelar</button>
              </div>
            </form>
            {errMsg && <p className="text-error text-xs mt-2">{errMsg}</p>}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
        ) : error ? (
          <div role="alert" className="alert alert-error text-sm">Error al cargar.</div>
        ) : !grapas || grapas.length === 0 ? (
          <div className="text-center py-8 text-base-content/40 text-sm">No hay referencias de fabricante configuradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Fabricante</th>
                  <th>Descripción</th>
                  <th className="text-right">€/metro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grapas.map(g => (
                  <tr key={g.id} className="hover">
                    <td className="font-semibold">{g.nombre}</td>
                    <td>
                      {g.fabricante
                        ? <span className="badge badge-ghost badge-sm">{g.fabricante}</span>
                        : <span className="text-base-content/30">—</span>}
                    </td>
                    <td className="text-sm text-base-content/50 max-w-[200px] truncate">{g.descripcion ?? '—'}</td>
                    <td className="text-right font-mono font-semibold">{formatCurrency(g.precioMetro)}</td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button className="btn btn-xs btn-ghost" onClick={() => abrirEditar(g)}><Pencil className="w-3.5 h-3.5" /></button>
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(g.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GrapasPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Hero header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-xl shrink-0">
          <Link2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Grapas y flejes</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Modelos genéricos para el cálculo automático en la calculadora de bandas, más referencias de fabricante para compras.
          </p>
        </div>
      </div>

      <SeccionModelosGenericos />
      <SeccionGrapasFabricante />
    </div>
  );
}
