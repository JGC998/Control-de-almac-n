"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { BarChart3, Pencil, Save, X, AlertTriangle, Package } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { toast, toastError } from '@/lib/toast';

function fmtMetros(v) {
  return v != null ? Number(v).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '0';
}

export default function StockRollosPage() {
  const { data: tarifas, isLoading, error } = useSWR('/api/tarifas-rollo', fetcher);

  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ stockMetros: '', stockMinimo: '' });
  const [guardando, setGuardando] = useState(false);
  const [filtroMaterial, setFiltroMaterial] = useState('');

  const materiales = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filtrados = useMemo(() => {
    if (!tarifas) return [];
    if (!filtroMaterial) return tarifas;
    return tarifas.filter(t => t.material === filtroMaterial);
  }, [tarifas, filtroMaterial]);

  const abrirEditar = (t) => {
    setEditandoId(t.id);
    setEditForm({
      stockMetros: t.stockMetros != null ? String(t.stockMetros) : '0',
      stockMinimo: t.stockMinimo != null ? String(t.stockMinimo) : '',
    });
  };

  const cancelarEditar = () => { setEditandoId(null); };

  const guardarStock = async (id) => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/tarifas-rollo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockMetros: parseFloat(editForm.stockMetros) || 0,
          stockMinimo: editForm.stockMinimo !== '' ? parseFloat(editForm.stockMinimo) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      await mutate('/api/tarifas-rollo');
      setEditandoId(null);
      toast('Stock actualizado');
    } catch (err) {
      toastError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="alert alert-error max-w-md">
          <span>Error al cargar las tarifas de rollo.</span>
        </div>
      </div>
    );
  }

  const bajosMinimo = filtrados.filter(t => (t.stockMinimo ?? 0) > 0 && t.stockMetros < t.stockMinimo);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-info/10 rounded-xl shrink-0">
          <BarChart3 className="w-8 h-8 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Stock de rollos</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Metros disponibles por referencia de rollo. Los datos del catálogo vienen de <a href="/tarifas" className="link link-info">Tarifas por rollo</a>.
          </p>
        </div>
      </div>

      {/* Alertas stock bajo mínimo */}
      {bajosMinimo.length > 0 && (
        <div role="alert" className="alert alert-warning text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            <strong>{bajosMinimo.length} {bajosMinimo.length === 1 ? 'referencia' : 'referencias'} por debajo del mínimo:</strong>{' '}
            {bajosMinimo.map(t => `${t.material} ${t.espesor}mm${t.ancho ? ` ${t.ancho}mm` : ''}${t.color ? ` ${t.color}` : ''}`).join(', ')}
          </span>
        </div>
      )}

      {/* Filtro material */}
      <div className="flex items-center gap-3">
        <select
          className="select select-bordered select-sm w-auto"
          value={filtroMaterial}
          onChange={e => setFiltroMaterial(e.target.value)}
        >
          <option value="">Todos los materiales ({tarifas?.length ?? 0})</option>
          {materiales.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {filtroMaterial && (
          <span className="text-sm text-base-content/50">{filtrados.length} referencias</span>
        )}
      </div>

      {/* Tabla */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th>Espesor</th>
                <th>Ancho</th>
                <th>Color</th>
                <th className="text-right">Metros/rollo</th>
                <th className="text-right">€/m²</th>
                <th className="text-right font-semibold text-info">Metros en stock</th>
                <th className="text-right">Mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-base-content/40">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay tarifas de rollo configuradas.</p>
                    <p className="text-xs mt-1">
                      Añade rollos en <a href="/tarifas" className="link">Tarifas → Tarifas por rollo</a>.
                    </p>
                  </td>
                </tr>
              ) : filtrados.map(t => {
                const bajoMin = (t.stockMinimo ?? 0) > 0 && t.stockMetros < t.stockMinimo;
                const editando = editandoId === t.id;
                return (
                  <tr key={t.id} className={`hover ${bajoMin ? 'bg-warning/5' : ''}`}>
                    <td className="font-semibold">{t.material}</td>
                    <td className="font-mono text-sm">{t.espesor} mm</td>
                    <td className="font-mono text-sm">{t.ancho ? `${t.ancho} mm` : <span className="opacity-30">—</span>}</td>
                    <td className="text-sm">{t.color || <span className="opacity-30">—</span>}</td>
                    <td className="text-right font-mono text-sm">{t.metrajeMinimo} m</td>
                    <td className="text-right font-mono text-sm">
                      {t.precioM2 != null
                        ? `${Number(t.precioM2).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                        : <span className="opacity-30">—</span>}
                    </td>

                    {/* Metros en stock — editable inline */}
                    <td className="text-right">
                      {editando ? (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          className="input input-bordered input-xs w-24 text-right font-mono"
                          value={editForm.stockMetros}
                          onChange={e => setEditForm(f => ({ ...f, stockMetros: e.target.value }))}
                          autoFocus
                        />
                      ) : (
                        <span className={`font-mono font-semibold text-sm ${bajoMin ? 'text-warning' : ''}`}>
                          {fmtMetros(t.stockMetros)} m
                          {bajoMin && <AlertTriangle className="inline w-3.5 h-3.5 ml-1 text-warning" />}
                        </span>
                      )}
                    </td>

                    {/* Mínimo — editable inline */}
                    <td className="text-right">
                      {editando ? (
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          className="input input-bordered input-xs w-20 text-right font-mono"
                          value={editForm.stockMinimo}
                          placeholder="—"
                          onChange={e => setEditForm(f => ({ ...f, stockMinimo: e.target.value }))}
                        />
                      ) : (
                        <span className="font-mono text-sm text-base-content/50">
                          {t.stockMinimo ? `${fmtMetros(t.stockMinimo)} m` : <span className="opacity-30">—</span>}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="text-right">
                      {editando ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            className="btn btn-xs btn-info"
                            onClick={() => guardarStock(t.id)}
                            disabled={guardando}
                          >
                            {guardando ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                          </button>
                          <button className="btn btn-xs btn-ghost" onClick={cancelarEditar}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-xs btn-ghost" onClick={() => abrirEditar(t)} title="Editar stock">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-base-content/40">
        Para añadir o modificar referencias de rollo ve a{' '}
        <a href="/tarifas" className="link">Tarifas → Tarifas por rollo</a>.
        Aquí solo se gestiona el stock físico (metros disponibles y mínimo de alerta).
      </p>
    </div>
  );
}
