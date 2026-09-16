"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { PackageSearch, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TablaTarifasCoste() {
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch('/api/tarifas-coste', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Error al importar: ${body.error || res.status}`);
        return;
      }
      const { migrados } = await res.json();
      await mutate('/api/tarifas-coste');
      alert(`Listo — ${migrados} materiales importados desde la tarifa de venta.`);
    } finally {
      setBackfilling(false);
    }
  };

  const { data: tarifas, isLoading, error } = useSWR('/api/tarifas-coste');

  const uniqueMaterials = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    return ['Todos', ...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filtered = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return <div className="text-error text-center py-8">Error al cargar tarifas de coste.</div>;
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="card-title">Tarifa de coste por m²</h2>
            <p className="text-sm text-base-content/50 mt-0.5">
              Actualizada automáticamente al guardar una importación de contenedor. Solo lectura.
            </p>
          </div>
        </div>

        {tarifas?.length === 0 ? (
          <div className="text-center py-16 text-base-content/30">
            <PackageSearch className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">Sin datos de coste todavía</p>
            <p className="text-sm mt-1 max-w-sm mx-auto">
              Los costes se registran automáticamente al guardar una importación.
              También puedes hacer una carga inicial desde los precios de la tarifa de venta actual.
            </p>
            <button
              className="btn btn-sm btn-outline mt-5 gap-2"
              onClick={handleBackfill}
              disabled={backfilling}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${backfilling ? 'animate-spin' : ''}`} />
              {backfilling ? 'Importando…' : 'Cargar desde tarifa de venta'}
            </button>
          </div>
        ) : (
          <>
            <div className="form-control w-full max-w-xs mb-4">
              <label className="label">
                <span className="label-text font-bold">Filtrar por Material:</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedMaterial}
                onChange={e => setSelectedMaterial(e.target.value)}
              >
                {uniqueMaterials.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto max-h-[70vh]">
              <table className="table table-zebra table-pin-rows table-sm w-full">
                <thead>
                  <tr>
                    <th className="text-center">Material</th>
                    <th className="text-center">Lonas</th>
                    <th className="text-center">Acabado</th>
                    <th className="text-center">Espesor (mm)</th>
                    <th className="text-center">Precio coste (€/m²)</th>
                    <th className="text-center">Peso (kg/m²)</th>
                    <th className="text-center">Última actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id} className="hover">
                      <td className="font-bold text-center">{row.material}</td>
                      <td className="text-center font-mono text-sm">
                        {row.lonas != null ? row.lonas : <span className="opacity-30">—</span>}
                      </td>
                      <td className="text-center text-sm">
                        {row.acabado || <span className="opacity-30">—</span>}
                      </td>
                      <td className="text-center font-mono">{row.espesor}</td>
                      <td className="text-center font-mono font-semibold text-primary">
                        {formatCurrency(row.precio)}
                      </td>
                      <td className="text-center font-mono text-sm">
                        {row.peso > 0
                          ? row.peso.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg'
                          : <span className="opacity-30">—</span>}
                      </td>
                      <td className="text-center text-xs text-base-content/50 tabular-nums">
                        {fmtFecha(row.actualizadoEn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && selectedMaterial !== 'Todos' && (
                <div className="text-center py-4 text-base-content/40 text-sm">
                  No hay datos de coste para este material.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
