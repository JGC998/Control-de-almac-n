"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Link2, Plus, Pencil, Trash2, Save, X, Settings, History } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS = { NORMAL: 'Normal', UNA: 'Uña' };
const TIPO_BADGE  = { NORMAL: 'badge-primary', UNA: 'badge-secondary' };

function espesorLabel(modelo) {
  if (modelo.tipo === 'UNA') return `${modelo.espesorDesde} mm`;
  return `${modelo.espesorDesde} – ${modelo.espesorHasta ?? '?'} mm`;
}

const FORM_VACIO = { tipo: 'NORMAL', nombre: '', espesorDesde: '', espesorHasta: '', anchosDisponibles: '', precioPor100mm: '' };

// ── Historial de precios de un modelo de grapa ───────────────────────────────

function HistorialGrapa({ modeloId }) {
  const { data: historial, isLoading } = useSWR(`/api/modelos-grapa/${modeloId}/historial`);
  const fmt4 = (v) => v?.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return (
    <div className="border-t border-base-200 bg-base-50 px-4 py-3">
      <h4 className="text-xs font-semibold text-base-content/60 uppercase tracking-wider mb-2">Historial de precios</h4>
      {isLoading ? (
        <span className="loading loading-spinner loading-xs" />
      ) : !historial || historial.length === 0 ? (
        <p className="text-xs text-base-content/40">Sin cambios registrados aún. Los cambios se registran al guardar una importación con este modelo de grapa.</p>
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

// ── Sección: Modelos genéricos de grapa ──────────────────────────────────────

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
  const [historialAbierto, setHistorialAbierto] = useState(null); // id del modelo

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
      alert('Error al guardar: ' + e.message);
    } finally {
      setGuardandoMerma(false);
    }
  };

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditandoId(null);
    setErrMsg('');
    setMostrarForm(true);
  };

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
    if (!confirm('¿Eliminar este modelo?')) return;
    try {
      const res = await fetch(`/api/modelos-grapa/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/modelos-grapa');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h2 className="card-title text-base">Modelos genéricos de grapa</h2>
          <button className="btn btn-sm btn-primary" onClick={abrirNuevo}>
            <Plus className="w-4 h-4" /> Añadir modelo
          </button>
        </div>

        <p className="text-xs text-base-content/50 mb-4">
          Define los modelos de grapa por rango de espesor con su precio por metro lineal.
          La calculadora de bandas usará estos modelos para calcular el coste automáticamente.
        </p>

        {/* Config merma */}
        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg mb-5">
          <Settings className="w-4 h-4 text-base-content/50 shrink-0" />
          <span className="text-sm font-medium">% Merma de grapa</span>
          <input
            type="number"
            className="input input-sm input-bordered w-24"
            min={0}
            max={100}
            step={1}
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
          <span className="text-xs text-base-content/40">
            Añade este % de desperdicio por extremo al calcular el coste de la grapa.
          </span>
        </div>

        {/* Modal / formulario inline */}
        {mostrarForm && (
          <div className="bg-base-200 rounded-xl p-4 mb-4 border border-base-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">{editandoId ? 'Editar modelo' : 'Nuevo modelo'}</h3>
              <button className="btn btn-xs btn-ghost" onClick={cerrarForm}><X className="w-3.5 h-3.5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Tipo */}
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

              {/* Nombre */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Nombre</span></label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder='Ej: 62, 125, HK1'
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </div>

              {/* Espesor desde */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs">
                    {form.tipo === 'UNA' ? 'Espesor (mm)' : 'Espesor desde (mm)'}
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  placeholder='Ej: 1.5'
                  min={0.1}
                  step={0.1}
                  value={form.espesorDesde}
                  onChange={e => setForm(f => ({ ...f, espesorDesde: e.target.value }))}
                  required
                />
              </div>

              {/* Espesor hasta (solo NORMAL) */}
              {form.tipo === 'NORMAL' && (
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Espesor hasta (mm)</span></label>
                  <input
                    type="number"
                    className="input input-bordered input-sm"
                    placeholder='Ej: 3.2'
                    min={0.1}
                    step={0.1}
                    value={form.espesorHasta}
                    onChange={e => setForm(f => ({ ...f, espesorHasta: e.target.value }))}
                    required
                  />
                </div>
              )}

              {/* Anchos disponibles */}
              <div className="form-control col-span-2 md:col-span-1">
                <label className="label py-1">
                  <span className="label-text text-xs">Anchos disponibles (mm)</span>
                  <span className="label-text-alt text-xs opacity-50">separados por coma</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm"
                  placeholder={form.tipo === 'UNA' ? 'Ej: 800' : 'Ej: 1000, 1200, 1500'}
                  value={form.anchosDisponibles}
                  onChange={e => setForm(f => ({ ...f, anchosDisponibles: e.target.value }))}
                />
              </div>

              {/* Precio */}
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Precio €/100mm de par</span></label>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  placeholder='0.00'
                  min={0}
                  step={0.001}
                  value={form.precioPor100mm}
                  onChange={e => setForm(f => ({ ...f, precioPor100mm: e.target.value }))}
                  required
                />
              </div>

              {/* Botones */}
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

        {/* Tabla */}
        {isLoading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner" /></div>
        ) : error ? (
          <div role="alert" className="alert alert-error text-sm">Error al cargar los modelos.</div>
        ) : modelos.length === 0 ? (
          <div className="text-center py-8 text-base-content/40 text-sm">
            No hay modelos configurados. Añade los modelos de grapa que usas.
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nombre</th>
                  <th>Espesor</th>
                  <th>Anchos disponibles (mm)</th>
                  <th className="text-right">€/100mm par</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {modelos.map(m => (
                  <tr key={m.id} className="hover">
                    <td>
                      <span className={`badge badge-sm ${TIPO_BADGE[m.tipo] ?? 'badge-ghost'}`}>
                        {TIPO_LABELS[m.tipo] ?? m.tipo}
                      </span>
                    </td>
                    <td className="font-semibold">{m.nombre}</td>
                    <td className="font-mono text-sm">{espesorLabel(m)}</td>
                    <td className="font-mono text-sm text-base-content/70">
                      {Array.isArray(m.anchosDisponibles) && m.anchosDisponibles.length > 0
                        ? m.anchosDisponibles.join(', ')
                        : <span className="text-base-content/30">—</span>}
                    </td>
                    <td className="text-right font-mono">{formatCurrency(m.precioPor100mm)}</td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button className="btn btn-xs btn-ghost" onClick={() => setHistorialAbierto(prev => prev === m.id ? null : m.id)} title="Historial de precios">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => abrirEditar(m)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(m.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {historialAbierto && <HistorialGrapa modeloId={historialAbierto} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sección: Grapas de fabricante ────────────────────────────────────────────

const GRAPA_FORM_VACIO = { nombre: '', fabricante: '', descripcion: '', precioMetro: '' };

function SeccionGrapasFabricante() {
  const { data: grapas, isLoading, error } = useSWR('/api/grapas');
  const [form, setForm] = useState(GRAPA_FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const abrirNuevo = () => { setForm(GRAPA_FORM_VACIO); setEditandoId(null); setErrMsg(''); setMostrarForm(true); };
  const abrirEditar = (g) => {
    setForm({ nombre: g.nombre, fabricante: g.fabricante ?? '', descripcion: g.descripcion ?? '', precioMetro: String(g.precioMetro) });
    setEditandoId(g.id);
    setErrMsg('');
    setMostrarForm(true);
  };
  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setErrMsg(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrMsg('');
    const payload = { ...form, precioMetro: parseFloat(form.precioMetro) || 0 };
    try {
      if (editandoId) {
        const res = await fetch(`/api/grapas/${editandoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message);
      } else {
        const res = await fetch('/api/grapas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message);
      }
      await mutate('/api/grapas');
      cerrarForm();
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta grapa?')) return;
    try {
      const res = await fetch(`/api/grapas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/grapas');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h2 className="card-title text-base">Grapas por fabricante</h2>
          <button className="btn btn-sm btn-outline" onClick={abrirNuevo}>
            <Plus className="w-4 h-4" /> Añadir
          </button>
        </div>
        <p className="text-xs text-base-content/50 mb-4">
          Referencia de los modelos específicos de cada fabricante (ANKER, MATO, CHINO…). Se usan como referencia de compra, no para el cálculo de precio.
        </p>

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
          <div className="text-center py-6 text-base-content/40 text-sm">No hay grapas de fabricante configuradas.</div>
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
                    <td className="text-base-content/60">{g.fabricante ?? '—'}</td>
                    <td className="text-sm text-base-content/50 max-w-[200px] truncate">{g.descripcion ?? '—'}</td>
                    <td className="text-right font-mono">{formatCurrency(g.precioMetro)}</td>
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

// ── Página ───────────────────────────────────────────────────────────────────

export default function GrapasPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link2 className="w-7 h-7" />
        <h1 className="text-3xl font-bold">Grapas</h1>
      </div>

      <div className="space-y-6">
        <SeccionModelosGenericos />
        <SeccionGrapasFabricante />
      </div>
    </div>
  );
}
