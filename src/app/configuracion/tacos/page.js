"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { AlignJustify, Plus, Trash2, Save, X, Pencil } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';
import { toastError } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { fetcher } from '@/lib/fetcher';

const TIPOS = [
  { valor: 'RECTO',     etiqueta: 'Recto',     color: 'badge-primary' },
  { valor: 'INCLINADO', etiqueta: 'Inclinado', color: 'badge-secondary' },
];

const FORM_VACIO = { tipo: 'RECTO', altura: '', precioMetro: '' };

export default function TacosPage() {
  const { data: tacos, isLoading, error } = useSWR('/api/tacos', fetcher);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [editandoPrecio, setEditandoPrecio] = useState(null);
  const [precioEdit, setPrecioEdit] = useState('');
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const grupos = useMemo(() =>
    TIPOS.map(t => ({
      ...t,
      items: (tacos ?? []).filter(x => x.tipo === t.valor).sort((a, b) => a.altura - b.altura),
    })),
  [tacos]);

  const abrirForm = () => { setForm(FORM_VACIO); setErrMsg(''); setMostrarForm(true); };
  const cerrarForm = () => { setMostrarForm(false); setErrMsg(''); };

  const handleCrear = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setErrMsg('');
    try {
      const res = await fetch('/api/tacos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo,
          altura: parseInt(form.altura) || 0,
          precioMetro: parseFloat(form.precioMetro) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/tacos');
      cerrarForm();
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditarPrecio = (taco) => {
    setEditandoPrecio(taco.id);
    setPrecioEdit(String(taco.precioMetro));
  };

  const guardarPrecio = async (id) => {
    setGuardandoPrecio(true);
    try {
      const res = await fetch('/api/tacos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ id, precioMetro: parseFloat(precioEdit) || 0 }] }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/tacos');
      setEditandoPrecio(null);
    } catch (e) {
      toastError('Error al guardar: ' + e.message);
    } finally {
      setGuardandoPrecio(false);
    }
  };

  const handleEliminar = async (id) => {
    const ok = await confirmar({ titulo: '¿Eliminar este taco?' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/tacos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).message);
      await mutate('/api/tacos');
    } catch (e) {
      toastError('Error: ' + e.message);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <ModalConfirmacion />

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-secondary/10 rounded-xl shrink-0">
          <AlignJustify className="w-8 h-8 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Tacos</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Tarifas de tacos de goma por tipo y altura. La calculadora de bandas los usa para calcular el coste del taco.
          </p>
        </div>
        <button className="btn btn-sm btn-primary gap-1 shrink-0" onClick={abrirForm}>
          <Plus className="w-4 h-4" /> Nuevo taco
        </button>
      </div>

      {/* Formulario nuevo */}
      {mostrarForm && (
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body py-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">Nuevo taco</h3>
              <button className="btn btn-xs btn-ghost" onClick={cerrarForm}><X className="w-3.5 h-3.5" /></button>
            </div>
            <form onSubmit={handleCrear} className="grid grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Tipo</span></label>
                <select className="select select-bordered select-sm" value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} required>
                  {TIPOS.map(t => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Altura (mm)</span></label>
                <input type="number" className="input input-bordered input-sm" placeholder='Ej: 10, 20, 40'
                  min={1} step={1} value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} required />
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text text-xs">Precio (€/metro)</span></label>
                <input type="number" className="input input-bordered input-sm" placeholder='0.00'
                  min={0} step={0.01} value={form.precioMetro} onChange={e => setForm(f => ({ ...f, precioMetro: e.target.value }))} required />
              </div>
              <div className="col-span-3 flex gap-2 justify-end">
                <button type="submit" className="btn btn-sm btn-primary" disabled={guardando}>
                  {guardando ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={cerrarForm}>Cancelar</button>
              </div>
            </form>
            {errMsg && <p className="text-error text-xs mt-2">{errMsg}</p>}
          </div>
        </div>
      )}

      {/* Loading / error */}
      {isLoading && (
        <div className="flex justify-center py-12"><span className="loading loading-spinner loading-md" /></div>
      )}
      {error && (
        <div role="alert" className="alert alert-error text-sm">Error al cargar los tacos.</div>
      )}

      {/* Grupos por tipo */}
      {!isLoading && !error && grupos.map(grupo => (
        <div key={grupo.valor} className="card bg-base-100 shadow border border-base-200">
          <div className="card-body py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`badge ${grupo.color}`}>{grupo.etiqueta}</span>
              <span className="text-xs text-base-content/40">{grupo.items.length} taco{grupo.items.length !== 1 ? 's' : ''}</span>
            </div>

            {grupo.items.length === 0 ? (
              <p className="text-sm text-base-content/40 py-2">Sin tacos {grupo.etiqueta.toLowerCase()}s configurados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Altura</th>
                      <th className="text-right">€/metro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map(taco => (
                      <tr key={taco.id} className="hover">
                        <td>
                          <span className="font-mono font-semibold">{taco.altura} mm</span>
                        </td>
                        <td className="text-right">
                          {editandoPrecio === taco.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                className="input input-xs input-bordered w-24 font-mono text-right"
                                min={0} step={0.01}
                                value={precioEdit}
                                onChange={e => setPrecioEdit(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') guardarPrecio(taco.id); if (e.key === 'Escape') setEditandoPrecio(null); }}
                                autoFocus
                              />
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={() => guardarPrecio(taco.id)}
                                disabled={guardandoPrecio}
                              >
                                {guardandoPrecio ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3 h-3" />}
                              </button>
                              <button className="btn btn-xs btn-ghost" onClick={() => setEditandoPrecio(null)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="font-mono font-semibold hover:text-primary transition-colors group flex items-center gap-1 ml-auto"
                              onClick={() => abrirEditarPrecio(taco)}
                              title="Editar precio"
                            >
                              {formatCurrency(taco.precioMetro)}
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                            </button>
                          )}
                        </td>
                        <td className="text-right w-10">
                          <button className="btn btn-xs btn-ghost text-error" onClick={() => handleEliminar(taco.id)} title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}

      {!isLoading && !error && (tacos ?? []).length === 0 && !mostrarForm && (
        <div className="text-center py-14 text-base-content/40">
          <AlignJustify className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No hay tacos configurados. Pulsa "Nuevo taco" para añadir el primero.</p>
        </div>
      )}
    </div>
  );
}
