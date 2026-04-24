"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Settings, DollarSign, Layers, TrendingUp, Package,
  Wrench, Download, Plus, Save, RefreshCw, Trash2, AlignJustify, ScrollText,
} from 'lucide-react';
import GestorCatalogo from '@/componentes/productos/GestorCatalogo';
import BulkPriceUpdateModal from '@/componentes/modales/ModalActualizacionPrecios';

// ─── Gestión inline de Tacos ───────────────────────────────────────────────
function GestionTacos() {
  const { data: tacos, isLoading, error } = useSWR('/api/tacos');
  const [editedPrices, setEditedPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [newTaco, setNewTaco] = useState({ tipo: 'RECTO', altura: '', precioMetro: '' });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const tacosRectos = tacos?.filter(t => t.tipo === 'RECTO') || [];
  const tacosInclinados = tacos?.filter(t => t.tipo === 'INCLINADO') || [];
  const hasChanges = Object.keys(editedPrices).length > 0;

  const getCurrentPrice = (taco) =>
    editedPrices[taco.id] !== undefined ? editedPrices[taco.id] : taco.precioMetro;

  const handleCreate = async () => {
    if (!newTaco.altura || newTaco.precioMetro === '') {
      setMessage({ type: 'warning', text: 'Rellena todos los campos antes de añadir' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tacos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaco),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setNewTaco({ tipo: 'RECTO', altura: '', precioMetro: '' });
      setMessage({ type: 'success', text: 'Taco añadido correctamente' });
      mutate('/api/tacos');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al crear el taco' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/tacos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      const next = { ...editedPrices };
      delete next[id];
      setEditedPrices(next);
      mutate('/api/tacos');
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar el taco' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSavePrices = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setMessage(null);
    try {
      const updates = Object.entries(editedPrices).map(([id, precioMetro]) => ({
        id: parseInt(id),
        precioMetro,
      }));
      const res = await fetch('/api/tacos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error();
      setEditedPrices({});
      setMessage({ type: 'success', text: `${updates.length} precios guardados` });
      mutate('/api/tacos');
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="alert alert-error"><span>Error al cargar los tacos</span></div>;

  const TacoTable = ({ items, badgeLabel, badgeColor }) => (
    <div className="card bg-base-100 shadow mb-6">
      <div className="card-body py-4">
        <h3 className="font-bold flex items-center gap-2">
          <span className={`badge badge-${badgeColor}`}>{badgeLabel}</span>
          <span className="text-base-content/60 text-sm font-normal">{items.length} referencias</span>
        </h3>
        <table className="table table-zebra table-sm mt-2">
          <thead>
            <tr><th>Altura</th><th>Precio / metro lineal</th><th></th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-base-content/40 py-6">Sin referencias — añade una arriba</td></tr>
            ) : items.map(taco => (
              <tr key={taco.id} className={editedPrices[taco.id] !== undefined ? 'bg-warning/10' : ''}>
                <td><span className="font-bold">{taco.altura} mm</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0"
                      value={getCurrentPrice(taco)}
                      onChange={e => setEditedPrices(prev => ({ ...prev, [taco.id]: parseFloat(e.target.value) || 0 }))}
                      className="input input-bordered input-sm w-28"
                    />
                    <span className="text-base-content/50 text-sm">€/m</span>
                    {editedPrices[taco.id] !== undefined && (
                      <span className="badge badge-warning badge-sm">Modificado</span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => handleDelete(taco.id)}
                    disabled={deleting === taco.id}
                    title="Eliminar"
                  >
                    {deleting === taco.id
                      ? <span className="loading loading-spinner loading-xs"></span>
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          Precios en €/metro lineal usados en el cálculo de bandas PVC
        </p>
        <div className="flex gap-2">
          {hasChanges && (
            <button onClick={() => setEditedPrices({})} className="btn btn-ghost btn-sm gap-1">
              <RefreshCw className="w-4 h-4" /> Descartar
            </button>
          )}
          <button
            onClick={handleSavePrices}
            className="btn btn-primary btn-sm gap-1"
            disabled={!hasChanges || saving}
          >
            {saving ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4" />}
            Guardar precios
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type} mb-4 py-2`}>
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="card bg-base-200 mb-6">
        <div className="card-body py-4">
          <h3 className="font-semibold text-sm flex items-center gap-1 mb-3">
            <Plus className="w-4 h-4" /> Añadir nuevo tipo de taco
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Tipo</span></label>
              <select
                className="select select-bordered select-sm"
                value={newTaco.tipo}
                onChange={e => setNewTaco(p => ({ ...p, tipo: e.target.value }))}
              >
                <option value="RECTO">RECTO</option>
                <option value="INCLINADO">INCLINADO</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Altura (mm)</span></label>
              <input
                type="number" min="1" step="1" placeholder="Ej: 50"
                value={newTaco.altura}
                onChange={e => setNewTaco(p => ({ ...p, altura: e.target.value }))}
                className="input input-bordered input-sm w-28"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Precio €/m</span></label>
              <input
                type="number" min="0" step="0.01" placeholder="Ej: 1.50"
                value={newTaco.precioMetro}
                onChange={e => setNewTaco(p => ({ ...p, precioMetro: e.target.value }))}
                className="input input-bordered input-sm w-28"
              />
            </div>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <span className="loading loading-spinner loading-xs"></span> : <Plus className="w-4 h-4" />}
              Añadir
            </button>
          </div>
        </div>
      </div>

      <TacoTable items={tacosRectos} badgeLabel="RECTOS" badgeColor="primary" />
      <TacoTable items={tacosInclinados} badgeLabel="INCLINADOS" badgeColor="secondary" />
    </div>
  );
}

// ─── Gestión inline de Tarifas por Rollo ──────────────────────────────────
function GestionTarifasRollo({ margenes }) {
  const { data: tarifas, isLoading, error } = useSWR('/api/tarifas-rollo');
  const { data: materiales } = useSWR('/api/materiales');
  const [editedData, setEditedData] = useState({}); // { [id]: { precioBase?, metrajeMinimo?, peso?, ancho? } }
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [newTarifa, setNewTarifa] = useState({
    material: '', espesor: '', ancho: '', color: '', metrajeMinimo: '10', precioBase: '', peso: '',
  });

  const selectedMargin = useMemo(
    () => margenes?.find(m => m.id === selectedMarginId) || null,
    [margenes, selectedMarginId]
  );

  const hasChanges = Object.keys(editedData).length > 0;

  const getVal = (tarifa, field) =>
    editedData[tarifa.id]?.[field] !== undefined ? editedData[tarifa.id][field] : tarifa[field];

  const setField = (id, field, value) =>
    setEditedData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const precioFinal = (precioBase) =>
    selectedMargin ? precioBase * selectedMargin.multiplicador : null;

  const handleCreate = async () => {
    if (!newTarifa.material || !newTarifa.espesor || !newTarifa.precioBase || !newTarifa.peso) {
      setMessage({ type: 'warning', text: 'Material, espesor, precio base y peso son obligatorios' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tarifas-rollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTarifa),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setNewTarifa({ material: '', espesor: '', color: '', metrajeMinimo: '10', precioBase: '', peso: '' });
      setMessage({ type: 'success', text: 'Tarifa añadida correctamente' });
      mutate('/api/tarifas-rollo');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error al crear la tarifa' });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(
        Object.entries(editedData).map(([id, changes]) => {
          const payload = { ...changes };
          if ('ancho' in payload) {
            payload.ancho = payload.ancho !== '' ? parseFloat(payload.ancho) : null;
          }
          return fetch(`/api/tarifas-rollo/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(r => { if (!r.ok) throw new Error(); });
        })
      );
      setEditedData({});
      setMessage({ type: 'success', text: 'Cambios guardados correctamente' });
      mutate('/api/tarifas-rollo');
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar los cambios' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/tarifas-rollo/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      const next = { ...editedData };
      delete next[id];
      setEditedData(next);
      mutate('/api/tarifas-rollo');
    } catch {
      setMessage({ type: 'error', text: 'Error al eliminar la tarifa' });
    } finally {
      setDeleting(null);
    }
  };

  if (isLoading) return <div className="flex justify-center p-6"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="alert alert-error"><span>Error al cargar las tarifas</span></div>;

  return (
    <div>
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-base-content/60">Vista con margen:</span>
          <select
            className="select select-bordered select-sm"
            value={selectedMarginId}
            onChange={e => setSelectedMarginId(e.target.value)}
          >
            <option value="">— Sin margen —</option>
            {(margenes || []).map(m => (
              <option key={m.id} value={m.id}>{m.descripcion} (×{m.multiplicador})</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button onClick={() => setEditedData({})} className="btn btn-ghost btn-sm gap-1">
              <RefreshCw className="w-4 h-4" /> Descartar
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm gap-1"
            disabled={!hasChanges || saving}
          >
            {saving ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type} mb-4 py-2`}>
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Formulario de alta */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body py-4">
          <h3 className="font-semibold text-sm flex items-center gap-1 mb-3">
            <Plus className="w-4 h-4" /> Añadir nueva tarifa por rollo
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Material</span></label>
              <select
                className="select select-bordered select-sm w-36"
                value={newTarifa.material}
                onChange={e => setNewTarifa(p => ({ ...p, material: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {(materiales || []).map(m => (
                  <option key={m.id} value={m.nombre}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Espesor (mm)</span></label>
              <input
                type="number" min="0" step="0.1" placeholder="Ej: 3"
                value={newTarifa.espesor}
                onChange={e => setNewTarifa(p => ({ ...p, espesor: e.target.value }))}
                className="input input-bordered input-sm w-24"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Ancho (mm)</span></label>
              <input
                type="number" min="0" step="1" placeholder="Ej: 1000"
                value={newTarifa.ancho}
                onChange={e => setNewTarifa(p => ({ ...p, ancho: e.target.value }))}
                className="input input-bordered input-sm w-24"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Color (opcional)</span></label>
              <input
                type="text" placeholder="Ej: NEGRO"
                value={newTarifa.color}
                onChange={e => setNewTarifa(p => ({ ...p, color: e.target.value }))}
                className="input input-bordered input-sm w-24"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Metros mín.</span></label>
              <input
                type="number" min="1" step="1" placeholder="10"
                value={newTarifa.metrajeMinimo}
                onChange={e => setNewTarifa(p => ({ ...p, metrajeMinimo: e.target.value }))}
                className="input input-bordered input-sm w-20"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Precio rollo (€)</span></label>
              <input
                type="number" min="0" step="0.01" placeholder="Ej: 4.50"
                value={newTarifa.precioBase}
                onChange={e => setNewTarifa(p => ({ ...p, precioBase: e.target.value }))}
                className="input input-bordered input-sm w-28"
              />
            </div>
            <div className="form-control">
              <label className="label py-0 pb-1"><span className="label-text text-xs">Peso kg/m²</span></label>
              <input
                type="number" min="0" step="0.001" placeholder="Ej: 3.2"
                value={newTarifa.peso}
                onChange={e => setNewTarifa(p => ({ ...p, peso: e.target.value }))}
                className="input input-bordered input-sm w-24"
              />
            </div>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <span className="loading loading-spinner loading-xs"></span> : <Plus className="w-4 h-4" />}
              Añadir
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card bg-base-100 shadow overflow-x-auto">
        <table className="table table-zebra table-sm">
          <thead>
            <tr>
              <th>Material</th>
              <th>Espesor</th>
              <th>Ancho</th>
              <th>Color</th>
              <th>Metros mín.</th>
              <th>Precio base rollo</th>
              {selectedMargin && <th>Precio final rollo</th>}
              <th>Peso (kg/m²)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(tarifas) || tarifas.length === 0 ? (
              <tr>
                <td colSpan={selectedMargin ? 9 : 8} className="text-center text-base-content/40 py-8">
                  Sin tarifas de rollo — añade una arriba
                </td>
              </tr>
            ) : tarifas.map(t => {
              const pb = parseFloat(getVal(t, 'precioBase'));
              const mm = parseFloat(getVal(t, 'metrajeMinimo'));
              const pf = precioFinal(pb);
              const changed = !!editedData[t.id];
              return (
                <tr key={t.id} className={changed ? 'bg-warning/10' : ''}>
                  <td className="font-bold">{t.material}</td>
                  <td>{t.espesor} mm</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" step="1"
                        value={getVal(t, 'ancho') ?? ''}
                        placeholder="—"
                        onChange={e => setField(t.id, 'ancho', e.target.value)}
                        className="input input-bordered input-xs w-16"
                      />
                      <span className="text-xs text-base-content/50">mm</span>
                    </div>
                  </td>
                  <td>{t.color || <span className="text-base-content/30">—</span>}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="1" step="1"
                        value={getVal(t, 'metrajeMinimo')}
                        onChange={e => setField(t.id, 'metrajeMinimo', e.target.value)}
                        className="input input-bordered input-xs w-16"
                      />
                      <span className="text-xs text-base-content/50">m</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" step="0.01"
                        value={getVal(t, 'precioBase')}
                        onChange={e => setField(t.id, 'precioBase', e.target.value)}
                        className="input input-bordered input-xs w-20"
                      />
                      <span className="text-xs text-base-content/50">€</span>
                      {changed && <span className="badge badge-warning badge-xs">Mod.</span>}
                    </div>
                  </td>
                  {selectedMargin && (
                    <td className="font-bold text-primary">
                      {pf !== null ? `${pf.toFixed(2)} €` : '—'}
                      <span className="text-xs text-base-content/50 ml-1">({mm}m)</span>
                    </td>
                  )}
                  <td>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" step="0.001"
                        value={getVal(t, 'peso')}
                        onChange={e => setField(t.id, 'peso', e.target.value)}
                        className="input input-bordered input-xs w-20"
                      />
                      <span className="text-xs text-base-content/50">kg/m²</span>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                    >
                      {deleting === t.id
                        ? <span className="loading loading-spinner loading-xs"></span>
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
const TABS = [
  { id: 'margenes', label: 'Márgenes',      icon: TrendingUp },
  { id: 'tarifas',  label: 'Tarifas m²',    icon: DollarSign },
  { id: 'rollos',   label: 'Tarifas rollo', icon: ScrollText },
  { id: 'tacos',    label: 'Tacos',         icon: Layers },
  { id: 'bobinas',  label: 'Bobinas',       icon: AlignJustify },
  { id: 'sistema',  label: 'Sistema',       icon: Wrench },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('margenes');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { data: materiales } = useSWR('/api/materiales');
  const { data: margenes } = useSWR('/api/pricing/margenes');

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Settings className="w-8 h-8" /> Configuración
      </h1>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-8 gap-1 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab gap-2 ${activeTab === id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── MÁRGENES ─────────────────────────────────────────────────────── */}
      {activeTab === 'margenes' && (
        <GestorCatalogo
          title="Reglas de Margen"
          endpoint="/api/pricing/margenes"
          initialForm={{ descripcion: '', base: '', multiplicador: 1.0, gastoFijo: 0.0, tipo: 'General', tierCliente: '' }}
          columns={[
            { key: 'descripcion', label: 'Descripción' },
            { key: 'base', label: 'Base' },
            { key: 'multiplicador', label: 'Multiplicador' },
            { key: 'gastoFijo', label: 'Gasto fijo (€)' },
          ]}
        />
      )}

      {/* ── TARIFAS m² ───────────────────────────────────────────────────── */}
      {activeTab === 'tarifas' && (
        <div className="relative">
          <div className="absolute top-4 right-36 z-10">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="btn btn-sm btn-warning btn-outline gap-1"
              title="Subir o bajar precios masivamente por porcentaje"
            >
              <TrendingUp className="w-3 h-3" /> Actualizar %
            </button>
          </div>
          <GestorCatalogo
            title="Tarifas de Material — por metro cuadrado"
            endpoint="/api/precios"
            initialForm={{ material: '', espesor: '', precio: '', peso: '' }}
            columns={[
              { key: 'material', label: 'Material' },
              { key: 'espesor', label: 'Espesor (mm)' },
              { key: 'precio', label: 'Precio (€/m²)' },
              { key: 'peso', label: 'Peso (kg/m²)' },
            ]}
          />
          <BulkPriceUpdateModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            materiales={materiales}
            onSuccess={() => mutate('/api/precios')}
          />
        </div>
      )}

      {/* ── TARIFAS ROLLO ────────────────────────────────────────────────── */}
      {activeTab === 'rollos' && <GestionTarifasRollo margenes={margenes} />}

      {/* ── TACOS ────────────────────────────────────────────────────────── */}
      {activeTab === 'tacos' && <GestionTacos />}

      {/* ── BOBINAS ──────────────────────────────────────────────────────── */}
      {activeTab === 'bobinas' && (
        <GestorCatalogo
          title="Referencias de Bobina"
          endpoint="/api/configuracion/referencias"
          initialForm={{ nombre: '', ancho: '', lonas: '', pesoPorMetroLineal: '' }}
          columns={[
            { key: 'referencia', label: 'Referencia' },
            { key: 'ancho', label: 'Ancho (mm)' },
            { key: 'lonas', label: 'Lonas' },
            { key: 'pesoPorMetroLineal', label: 'Peso (kg/m)' },
          ]}
        />
      )}

      {/* ── SISTEMA ──────────────────────────────────────────────────────── */}
      {activeTab === 'sistema' && (
        <div className="space-y-4 max-w-xl">
          <div className="card bg-base-100 shadow">
            <div className="card-body">
              <h3 className="card-title text-lg">
                <Download className="w-5 h-5" /> Copia de seguridad
              </h3>
              <p className="text-sm text-base-content/70 mb-4">
                Descarga la configuración completa (tarifas, márgenes, referencias) en formato JSON.
              </p>
              <a href="/api/config/backup" target="_blank" className="btn btn-primary gap-2 w-fit">
                <Download className="w-4 h-4" /> Descargar backup
              </a>
            </div>
          </div>
          <div className="alert alert-info">
            <Wrench className="w-5 h-5 shrink-0" />
            <span className="text-sm">Más opciones de sistema próximamente disponibles.</span>
          </div>
        </div>
      )}
    </div>
  );
}
