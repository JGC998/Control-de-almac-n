"use client";
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Layers, PlusCircle, Edit2, Trash2, Check, X, AlertTriangle, Package, Tag } from 'lucide-react';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';
import { toastError } from '@/lib/toast';

function EstadoBadge({ numProductos, numTarifas }) {
  if (numProductos === 0 && numTarifas === 0)
    return <span className="badge badge-error badge-sm gap-1"><AlertTriangle className="w-3 h-3" /> Sin uso</span>;
  if (numTarifas === 0)
    return <span className="badge badge-warning badge-sm">Sin tarifas</span>;
  return <span className="badge badge-success badge-sm">En uso</span>;
}

function FilaMaterial({ mat, onDelete }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre]     = useState(mat.nombre);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const guardar = async () => {
    if (!nombre.trim() || nombre.trim() === mat.nombre) { setEditando(false); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/materiales/${mat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      mutate('/api/materiales');
      setEditando(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <tr className="hover">
      <td className="w-1/2">
        {editando ? (
          <div className="flex gap-2 items-center">
            <input
              className="input input-sm input-bordered flex-1"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false); }}
              autoFocus
            />
            <button className="btn btn-xs btn-success" onClick={guardar} disabled={saving}>
              <Check className="w-3 h-3" />
            </button>
            <button className="btn btn-xs btn-ghost" onClick={() => { setNombre(mat.nombre); setEditando(false); }}>
              <X className="w-3 h-3" />
            </button>
            {error && <span className="text-error text-xs">{error}</span>}
          </div>
        ) : (
          <span className="font-medium">{mat.nombre}</span>
        )}
      </td>
      <td>
        <div className="flex items-center gap-1 text-sm">
          <Tag className="w-3.5 h-3.5 text-base-content/40" />
          <span className={mat.numTarifas === 0 ? 'text-warning' : ''}>{mat.numTarifas}</span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-1 text-sm">
          <Package className="w-3.5 h-3.5 text-base-content/40" />
          <span className={mat.numProductos === 0 ? 'text-base-content/40' : ''}>{mat.numProductos}</span>
        </div>
      </td>
      <td><EstadoBadge numProductos={mat.numProductos} numTarifas={mat.numTarifas} /></td>
      <td>
        <div className="flex gap-1">
          <button className="btn btn-xs btn-ghost btn-square" onClick={() => setEditando(true)} title="Renombrar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            className="btn btn-xs btn-ghost btn-square text-error"
            onClick={() => onDelete(mat)}
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function GestionMaterialesPage() {
  const { data: materiales = [], isLoading } = useSWR('/api/materiales');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando]         = useState(false);
  const [errorCrear, setErrorCrear]   = useState(null);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setCreando(true); setErrorCrear(null);
    try {
      const res = await fetch('/api/materiales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.message || 'Error'); }
      mutate('/api/materiales');
      setNuevoNombre('');
    } catch (e) { setErrorCrear(e.message); }
    finally { setCreando(false); }
  };

  const eliminar = async (mat) => {
    const aviso = mat.numProductos > 0 || mat.numTarifas > 0
      ? `Este material tiene ${mat.numTarifas} tarifa(s) y ${mat.numProductos} producto(s) asociados. ¿Seguro que quieres eliminarlo?`
      : '¿Eliminar este material?';
    const ok = await confirmar({ titulo: `Eliminar "${mat.nombre}"`, mensaje: aviso });
    if (!ok) return;
    try {
      const res = await fetch(`/api/materiales/${mat.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.message || 'Error'); }
      mutate('/api/materiales');
    } catch (e) { toastError(e.message); }
  };

  const sinUso    = materiales.filter(m => m.numProductos === 0 && m.numTarifas === 0);
  const sinTarifa = materiales.filter(m => m.numTarifas === 0 && m.numProductos > 0);

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <ModalConfirmacion />

      <div className="flex items-center gap-3 mb-6">
        <Layers className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold">Materiales</h1>
      </div>

      {/* Alertas de limpieza */}
      {sinUso.length > 0 && (
        <div className="alert alert-error mb-4 py-3">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            <strong>{sinUso.length} material(es) sin uso</strong> — no tienen tarifas ni productos asociados:
            {' '}{sinUso.map(m => m.nombre).join(', ')}. Considera eliminarlos.
          </span>
        </div>
      )}
      {sinTarifa.length > 0 && (
        <div className="alert alert-warning mb-4 py-3">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            <strong>{sinTarifa.length} material(es) sin tarifa m²</strong> — tienen productos pero sin precio configurado:
            {' '}{sinTarifa.map(m => m.nombre).join(', ')}.
          </span>
        </div>
      )}

      {/* Formulario crear */}
      <form onSubmit={crear} className="flex gap-2 mb-6">
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Nombre del nuevo material (ej: Goma, Fieltro, PVC)"
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
        />
        <button className="btn btn-primary gap-1" disabled={creando || !nuevoNombre.trim()}>
          <PlusCircle className="w-4 h-4" /> Añadir
        </button>
        {errorCrear && <span className="text-error text-sm self-center">{errorCrear}</span>}
      </form>

      {/* Tabla */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th><span title="Tarifas m² configuradas"><Tag className="w-3.5 h-3.5 inline" /> Tarifas</span></th>
                <th><span title="Productos que lo usan"><Package className="w-3.5 h-3.5 inline" /> Productos</span></th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="text-center py-8"><span className="loading loading-spinner" /></td></tr>
              )}
              {!isLoading && materiales.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-base-content/40">Sin materiales — añade uno arriba</td></tr>
              )}
              {materiales.map(mat => (
                <FilaMaterial key={mat.id} mat={mat} onDelete={eliminar} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-base-content/40 mt-3">
        {materiales.length} materiales · Haz clic en <Edit2 className="w-3 h-3 inline" /> para renombrar directamente en la tabla
      </p>
    </div>
  );
}
