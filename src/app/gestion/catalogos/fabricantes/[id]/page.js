"use client";
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Factory, ArrowLeft, Package, Edit, Check, X } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

function BadgeActivo({ activo }) {
  return (
    <span className={`badge badge-sm ${activo ? 'badge-success' : 'badge-ghost opacity-50'}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export default function FabricanteDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: fab, isLoading, error, mutate } = useSWR(`/api/fabricantes/${id}`, fetcher);

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startEdit = () => {
    setNombre(fab.nombre);
    setSaveError(null);
    setEditando(true);
  };

  const cancelEdit = () => {
    setEditando(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/fabricantes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar');
      }
      await mutate();
      setEditando(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );

  if (error || !fab) return (
    <div className="container mx-auto p-6">
      <div className="alert alert-error">Fabricante no encontrado.</div>
      <Link href="/gestion/catalogos/fabricantes" className="btn btn-ghost mt-4 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>
    </div>
  );

  const productos = fab.productos ?? [];
  const activos   = productos.filter(p => p.activo).length;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/gestion/catalogos/fabricantes" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Fabricantes
        </Link>
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Factory className="w-7 h-7 shrink-0 text-primary" />
          {editando ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                className="input input-bordered input-sm flex-1 font-bold text-lg"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
                autoFocus
              />
              <button className="btn btn-success btn-sm gap-1" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-xs" /> : <Check className="w-4 h-4" />}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={saving}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{fab.nombre}</h1>
              <button className="btn btn-ghost btn-xs" onClick={startEdit} title="Editar nombre">
                <Edit className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && <div className="alert alert-error mb-4 py-2 text-sm">{saveError}</div>}

      {/* KPIs */}
      <div className="stats shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-figure text-primary"><Package className="w-7 h-7" /></div>
          <div className="stat-title">Productos totales</div>
          <div className="stat-value text-primary">{productos.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Activos</div>
          <div className="stat-value text-success">{activos}</div>
        </div>
        {activos < productos.length && (
          <div className="stat">
            <div className="stat-title">Inactivos</div>
            <div className="stat-value text-base-content/40">{productos.length - activos}</div>
          </div>
        )}
      </div>

      {/* Tabla de productos */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> Productos asociados
            </h2>
          </div>
          {productos.length === 0 ? (
            <div className="px-5 pb-5 text-base-content/40 text-sm">
              Este fabricante no tiene productos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-base-content/50">
                    <th>Nombre</th>
                    <th>Ref. Fabricante</th>
                    <th>Tipo</th>
                    <th>Material</th>
                    <th className="text-right">Espesor</th>
                    <th className="text-right">Ancho</th>
                    <th className="text-right">Largo</th>
                    <th className="text-right">Precio</th>
                    <th className="text-right">Peso</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => (
                    <tr key={p.id} className={`hover ${!p.activo ? 'opacity-50' : ''}`}>
                      <td className="font-medium max-w-[180px] truncate">{p.nombre}</td>
                      <td className="font-mono text-xs text-base-content/60">{p.referenciaFabricante || '—'}</td>
                      <td><span className="badge badge-ghost badge-sm">{p.tipo}</span></td>
                      <td className="text-xs">{p.material?.nombre || '—'}</td>
                      <td className="text-right font-mono text-xs">{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                      <td className="text-right font-mono text-xs">{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                      <td className="text-right font-mono text-xs">{p.largo != null ? `${p.largo} mm` : '—'}</td>
                      <td className="text-right font-mono font-semibold">{formatCurrency(p.precioUnitario)}</td>
                      <td className="text-right font-mono text-xs">{p.pesoUnitario > 0 ? `${p.pesoUnitario} kg` : '—'}</td>
                      <td><BadgeActivo activo={p.activo} /></td>
                      <td className="text-right">
                        <Link href={`/gestion/productos/${p.id}`} className="btn btn-ghost btn-xs">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
