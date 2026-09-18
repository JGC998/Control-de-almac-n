"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { BarChart3, Package } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

export default function StockRollosPage() {
  const { data: tarifas, isLoading: loadTarifas, error: errTarifas } = useSWR('/api/tarifas-rollo', fetcher);
  const { data: margenes, isLoading: loadMargenes } = useSWR('/api/pricing/margenes', fetcher);

  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');

  const selectedMargin = useMemo(
    () => margenes?.find(m => m.id === selectedMarginId) ?? null,
    [margenes, selectedMarginId],
  );

  const materiales = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filtrados = useMemo(() => {
    if (!tarifas) return [];
    const lista = filtroMaterial ? tarifas.filter(t => t.material === filtroMaterial) : tarifas;
    return [...lista].sort((a, b) => {
      const m = a.material.localeCompare(b.material, 'es', { sensitivity: 'base' });
      if (m !== 0) return m;
      const e = (a.espesor ?? 0) - (b.espesor ?? 0);
      if (e !== 0) return e;
      return (a.ancho ?? 0) - (b.ancho ?? 0);
    });
  }, [tarifas, filtroMaterial]);

  if (loadTarifas || loadMargenes) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (errTarifas) {
    return (
      <div className="p-6">
        <div role="alert" className="alert alert-error max-w-md">
          <span>Error al cargar las tarifas de rollo.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-info/10 rounded-xl shrink-0">
          <BarChart3 className="w-8 h-8 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Stock de rollos</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Catálogo de rollos con precios base y precio final según tipo de cliente.
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs font-semibold">Margen / tipo de cliente</span></label>
          <select
            className="select select-bordered select-sm w-auto min-w-48"
            value={selectedMarginId}
            onChange={e => setSelectedMarginId(e.target.value)}
          >
            <option value="">Precio base (sin margen)</option>
            {margenes?.map(m => (
              <option key={m.id} value={m.id}>
                {m.descripcion}{m.tierCliente ? ` (${m.tierCliente})` : ''} ×{m.multiplicador}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label className="label py-1"><span className="label-text text-xs font-semibold">Material</span></label>
          <select
            className="select select-bordered select-sm w-auto"
            value={filtroMaterial}
            onChange={e => setFiltroMaterial(e.target.value)}
          >
            <option value="">Todos ({tarifas?.length ?? 0})</option>
            {materiales.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {filtroMaterial && (
          <span className="text-xs text-base-content/40 self-end pb-2">
            {filtrados.length} referencias
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="overflow-x-auto">
          <table className="table table-zebra table-sm w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th>Espesor</th>
                <th>Ancho</th>
                <th className="text-right">Metros/rollo</th>
                <th className="text-right" title="Viene de Tarifas por m²">€/m²</th>
                <th className="text-right">Precio base rollo</th>
                <th className="text-right font-semibold text-primary">
                  Precio final rollo
                  {selectedMargin && (
                    <span className="font-normal text-xs text-base-content/40 ml-1">
                      ×{selectedMargin.multiplicador}
                    </span>
                  )}
                </th>
                <th className="text-right">Kilos/rollo</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-base-content/40">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay tarifas de rollo configuradas.</p>
                    <p className="text-xs mt-1">
                      Añade rollos en{' '}
                      <a href="/tarifas" className="link">Tarifas → Tarifas por rollo</a>.
                    </p>
                  </td>
                </tr>
              ) : filtrados.map(t => {
                const precioBase = t.precioM2 != null && t.ancho
                  ? t.precioM2 * (t.ancho / 1000) * t.metrajeMinimo
                  : t.precioBase;
                const precioFinal = precioBase * (selectedMargin?.multiplicador ?? 1);
                return (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.material}</td>
                    <td className="font-mono text-sm">{t.espesor} mm</td>
                    <td className="font-mono text-sm">
                      {t.ancho ? `${t.ancho} mm` : <span className="opacity-30">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm">{t.metrajeMinimo} m</td>
                    <td className="text-right font-mono text-sm">
                      {t.precioM2 != null
                        ? `${Number(t.precioM2).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                        : <span className="opacity-30 text-xs">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm text-base-content/60">
                      {formatCurrency(precioBase)}
                    </td>
                    <td className="text-right font-mono font-semibold text-primary">
                      {formatCurrency(precioFinal)}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {Number(t.peso).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-base-content/40">
        El €/m² y precio base provienen de{' '}
        <a href="/tarifas" className="link">Tarifas por m²</a>.
        El precio final aplica el multiplicador del margen seleccionado.
        Para gestionar referencias ve a{' '}
        <a href="/tarifas" className="link">Tarifas → Tarifas por rollo</a>.
      </p>
    </div>
  );
}
