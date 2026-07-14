"use client";
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Tag, PlusCircle, Edit2, Trash2, Check, X, ChevronRight, Package } from 'lucide-react';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { toastError } from '@/lib/toast';

// ─── Fila editable de subfamilia ──────────────────────────────────────────────

function FilaSubfamilia({ sub, familiaId, onDelete }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre]     = useState(sub.nombre);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const guardar = async () => {
    if (!nombre.trim() || nombre.trim() === sub.nombre) { setEditando(false); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/subfamilias/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), familiaId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/familias');
      setEditando(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <tr className="hover">
      <td className="pl-6">
        {editando ? (
          <div className="flex gap-2 items-center">
            <input
              className="input input-sm input-bordered flex-1"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false); }}
              autoFocus
            />
            <button className="btn btn-xs btn-success" onClick={guardar} disabled={saving}><Check className="w-3 h-3" /></button>
            <button className="btn btn-xs btn-ghost" onClick={() => { setNombre(sub.nombre); setEditando(false); }}><X className="w-3 h-3" /></button>
            {error && <span className="text-error text-xs">{error}</span>}
          </div>
        ) : (
          <span className="text-sm">{sub.nombre}</span>
        )}
      </td>
      <td>
        <div className="flex gap-1">
          <button className="btn btn-xs btn-ghost btn-square" onClick={() => setEditando(true)} title="Renombrar">
            <Edit2 className="w-3 h-3" />
          </button>
          <button className="btn btn-xs btn-ghost btn-square text-error" onClick={() => onDelete(sub)} title="Eliminar">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Fila expandible de familia ───────────────────────────────────────────────

function FilaFamilia({ fam, onDeleteFamilia, onDeleteSubfamilia, expandida, onToggle }) {
  const [editando, setEditando]     = useState(false);
  const [nombre, setNombre]         = useState(fam.nombre);
  const [color, setColor]           = useState(fam.color ?? '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [nuevaSub, setNuevaSub]     = useState('');
  const [creandoSub, setCreandoSub] = useState(false);
  const [errorSub, setErrorSub]     = useState(null);

  const guardar = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/familias/${fam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), color: color || null, descripcion: fam.descripcion ?? null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/familias');
      setEditando(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const crearSubfamilia = async (e) => {
    e.preventDefault();
    if (!nuevaSub.trim()) return;
    setCreandoSub(true); setErrorSub(null);
    try {
      const res = await fetch('/api/subfamilias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaSub.trim(), familiaId: fam.id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/familias');
      setNuevaSub('');
    } catch (e) { setErrorSub(e.message); }
    finally { setCreandoSub(false); }
  };

  return (
    <>
      {/* Fila de familia */}
      <tr className="hover cursor-pointer" onClick={() => !editando && onToggle()}>
        <td className="w-8">
          <ChevronRight className={`w-4 h-4 transition-transform text-base-content/50 ${expandida ? 'rotate-90' : ''}`} />
        </td>
        <td>
          {editando ? (
            <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
              <input
                className="input input-sm input-bordered flex-1"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false); }}
                autoFocus
              />
              <input
                type="color"
                className="w-8 h-8 rounded cursor-pointer border border-base-300"
                value={color || '#666666'}
                onChange={e => setColor(e.target.value)}
                title="Color de familia"
              />
              <button className="btn btn-xs btn-success" onClick={guardar} disabled={saving}><Check className="w-3 h-3" /></button>
              <button className="btn btn-xs btn-ghost" onClick={() => { setNombre(fam.nombre); setColor(fam.color ?? ''); setEditando(false); }}><X className="w-3 h-3" /></button>
              {error && <span className="text-error text-xs">{error}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {fam.color && (
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: fam.color }} />
              )}
              <span className="font-semibold">{fam.nombre}</span>
            </div>
          )}
        </td>
        <td className="text-sm text-base-content/60">
          {(() => {
            const numSubs = fam.subfamilias?.length ?? 0;
            const numProds = (fam.subfamilias ?? []).reduce((s, sub) => s + (sub._count?.productos ?? 0), 0);
            const numArts  = (fam.subfamilias ?? []).reduce((s, sub) => s + (sub._count?.articulosSimples ?? 0), 0);
            return (
              <div className="flex flex-col gap-0.5">
                <span><Package className="w-3 h-3 inline mr-0.5" />{numSubs} subfamilia{numSubs !== 1 ? 's' : ''}</span>
                {(numProds > 0 || numArts > 0) && (
                  <span className="text-xs text-base-content/40">
                    {numProds > 0 && `${numProds} prod.`}{numProds > 0 && numArts > 0 && ' · '}{numArts > 0 && `${numArts} art.`}
                  </span>
                )}
              </div>
            );
          })()}
        </td>
        <td onClick={e => e.stopPropagation()}>
          <div className="flex gap-1">
            <button className="btn btn-xs btn-ghost btn-square" onClick={() => setEditando(true)} title="Editar">
              <Edit2 className="w-3 h-3" />
            </button>
            <button className="btn btn-xs btn-ghost btn-square text-error" onClick={() => onDeleteFamilia(fam)} title="Eliminar">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>

      {/* Subfamilias expandibles */}
      {expandida && (
        <>
          {(fam.subfamilias ?? []).map(sub => (
            <FilaSubfamilia key={sub.id} sub={sub} familiaId={fam.id} onDelete={onDeleteSubfamilia} />
          ))}
          {/* Fila para añadir subfamilia */}
          <tr>
            <td />
            <td colSpan={3} className="pl-6 pb-2">
              <form onSubmit={crearSubfamilia} className="flex gap-2">
                <input
                  type="text"
                  className="input input-xs input-bordered flex-1"
                  placeholder="Nueva subfamilia…"
                  value={nuevaSub}
                  onChange={e => setNuevaSub(e.target.value)}
                />
                <button className="btn btn-xs btn-primary gap-1" disabled={creandoSub || !nuevaSub.trim()}>
                  <PlusCircle className="w-3 h-3" /> Añadir
                </button>
                {errorSub && <span className="text-error text-xs self-center">{errorSub}</span>}
              </form>
            </td>
          </tr>
        </>
      )}
    </>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function GestionFamiliasPage() {
  const { data: familias = [], isLoading } = useSWR('/api/familias');
  const [expandidas, setExpandidas]        = useState(new Set());
  const [nuevoNombre, setNuevoNombre]      = useState('');
  const [nuevoColor, setNuevoColor]        = useState('#666666');
  const [creando, setCreando]              = useState(false);
  const [errorCrear, setErrorCrear]        = useState(null);
  const { confirmar, ModalConfirmacion }   = useConfirmacion();

  const toggleExpandida = (id) => {
    setExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const crearFamilia = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true); setErrorCrear(null);
    try {
      const res = await fetch('/api/familias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim(), color: nuevoColor }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      const nueva = await res.json();
      mutate('/api/familias');
      setNuevoNombre('');
      // Expandir la familia recién creada
      setExpandidas(prev => new Set([...prev, nueva.id]));
    } catch (e) { setErrorCrear(e.message); }
    finally { setCreando(false); }
  };

  const eliminarFamilia = async (fam) => {
    const numSubs = fam.subfamilias?.length ?? 0;
    const msg = numSubs > 0
      ? `"${fam.nombre}" tiene ${numSubs} subfamilia(s). Se eliminarán todas las subfamilias y los productos asignados quedarán sin clasificar. ¿Continuar?`
      : `¿Eliminar la familia "${fam.nombre}"?`;
    const ok = await confirmar({ titulo: `Eliminar "${fam.nombre}"`, mensaje: msg });
    if (!ok) return;
    try {
      // Eliminar subfamilias primero (el servidor no hace cascada)
      if (numSubs > 0) {
        await Promise.all(
          (fam.subfamilias ?? []).map(s =>
            fetch(`/api/subfamilias/${s.id}`, { method: 'DELETE' })
          )
        );
      }
      const res = await fetch(`/api/familias/${fam.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/familias');
    } catch (e) { toastError(e.message); }
  };

  const eliminarSubfamilia = async (sub) => {
    const ok = await confirmar({
      titulo: `Eliminar "${sub.nombre}"`,
      mensaje: `Los productos asignados a esta subfamilia quedarán sin clasificar. ¿Continuar?`,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/subfamilias/${sub.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Error'); }
      mutate('/api/familias');
    } catch (e) { toastError(e.message); }
  };

  const totalSubs  = familias.reduce((acc, f) => acc + (f.subfamilias?.length ?? 0), 0);
  const totalProds = familias.reduce((acc, f) =>
    acc + (f.subfamilias ?? []).reduce((s, sub) => s + (sub._count?.productos ?? 0), 0), 0);
  const totalArts  = familias.reduce((acc, f) =>
    acc + (f.subfamilias ?? []).reduce((s, sub) => s + (sub._count?.articulosSimples ?? 0), 0), 0);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <ModalConfirmacion />

      <div className="flex items-center gap-3 mb-6">
        <Tag className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Familias y Subfamilias</h1>
          <p className="text-sm text-base-content/60">Jerarquía de clasificación del catálogo de productos</p>
        </div>
      </div>

      {/* Formulario crear familia */}
      <form onSubmit={crearFamilia} className="flex gap-2 mb-6">
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Nueva familia (ej: GOMA, PVC, FIELTRO)"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
        />
        <input
          type="color"
          className="w-10 h-10 rounded cursor-pointer border border-base-300"
          value={nuevoColor}
          onChange={e => setNuevoColor(e.target.value)}
          title="Color de familia"
        />
        <button className="btn btn-primary gap-1" disabled={creando || !nuevoNombre.trim()}>
          <PlusCircle className="w-4 h-4" /> Añadir familia
        </button>
        {errorCrear && <span className="text-error text-sm self-center">{errorCrear}</span>}
      </form>

      {/* Tabla */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th className="w-8" />
                <th>Familia / Subfamilia</th>
                <th>Subfamilias</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="text-center py-8"><span className="loading loading-spinner" /></td></tr>
              )}
              {!isLoading && familias.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-base-content/40">Sin familias — añade una arriba</td></tr>
              )}
              {familias.map(fam => (
                <FilaFamilia
                  key={fam.id}
                  fam={fam}
                  expandida={expandidas.has(fam.id)}
                  onToggle={() => toggleExpandida(fam.id)}
                  onDeleteFamilia={eliminarFamilia}
                  onDeleteSubfamilia={eliminarSubfamilia}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-base-content/40 mt-3">
        {familias.length} familias · {totalSubs} subfamilias · {totalProds} productos · {totalArts} artículos · Haz clic en una fila para expandir
      </p>
    </div>
  );
}
