"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatCurrency } from '@/utils/utilidades';
import { Download, Settings } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TablaTarifasRollo() {
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');

  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/tarifas-rollo');
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');

  const isLoading = tarifasLoading || margenesLoading;

  const selectedMargin = useMemo(
    () => margenes?.find(m => m.id === selectedMarginId) || null,
    [margenes, selectedMarginId]
  );

  const uniqueMaterials = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    return ['Todos', ...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filteredTarifas = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  const handleExportPDF = () => {
    if (filteredTarifas.length === 0) {
      alert('No hay tarifas para exportar.');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Tabla de Tarifas por Rollo / Metraje', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const margenText = selectedMargin
      ? `Margen: ${selectedMargin.descripcion} (x${selectedMargin.multiplicador})`
      : 'Margen: Ninguno (Precio Base)';
    doc.text(`Filtro: ${selectedMaterial}`, 14, 30);
    doc.text(margenText, 14, 36);

    const columns = [
      'Material', 'Espesor', 'Ancho', 'Color',
      'Metros mín.',
      `Precio base rollo`,
      `Precio final rollo`,
      'Peso (kg/m²)',
    ];

    const rows = filteredTarifas.map(t => {
      const pf = t.precioBase * (selectedMargin?.multiplicador || 1);
      return [
        t.material,
        `${t.espesor} mm`,
        t.ancho ? `${t.ancho} mm` : '—',
        t.color || '—',
        `${t.metrajeMinimo} m`,
        `${t.precioBase.toFixed(2)} €  (${t.metrajeMinimo}m)`,
        `${pf.toFixed(2)} €  (${t.metrajeMinimo}m)`,
        `${t.peso.toFixed(3)} kg`,
      ];
    });

    autoTable(doc, { head: [columns], body: rows, startY: 45, theme: 'grid' });

    const suffix = new Date().toISOString().slice(0, 10);
    const name = selectedMaterial === 'Todos'
      ? `tarifas-rollo-${suffix}.pdf`
      : `tarifa-rollo-${selectedMaterial.toLowerCase()}-${suffix}.pdf`;
    doc.save(name);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tarifas por Rollo / Metraje</h2>
          <div className="flex gap-2">
            <Link href="/configuracion">
              <button className="btn btn-neutral btn-sm gap-1">
                <Settings className="w-4 h-4" /> Gestionar
              </button>
            </Link>
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary btn-sm gap-1"
              disabled={filteredTarifas.length === 0}
            >
              <Download className="w-4 h-4" /> Imprimir tarifa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Simular precio con margen:</span></label>
            <select
              className="select select-bordered"
              value={selectedMarginId}
              onChange={e => setSelectedMarginId(e.target.value)}
            >
              <option value="">Precio base (sin margen)</option>
              {margenes?.map(m => (
                <option key={m.id} value={m.id}>
                  {m.descripcion}{m.tierCliente ? ` (${m.tierCliente})` : ''} (×{m.multiplicador})
                </option>
              ))}
            </select>
          </div>

          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Filtrar por material:</span></label>
            <select
              className="select select-bordered"
              value={selectedMaterial}
              onChange={e => setSelectedMaterial(e.target.value)}
            >
              {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th>Espesor</th>
                <th>Ancho</th>
                <th>Color</th>
                <th>Metros mín.</th>
                <th>Precio base rollo</th>
                <th className="font-bold">Precio final rollo</th>
                <th>Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-base-content/40">Sin tarifas de rollo disponibles</td></tr>
              ) : filteredTarifas.map(t => {
                const pf = t.precioBase * (selectedMargin?.multiplicador || 1);
                return (
                  <tr key={t.id} className="hover">
                    <td className="font-bold">{t.material}</td>
                    <td>{t.espesor} mm</td>
                    <td>{t.ancho ? `${t.ancho} mm` : <span className="opacity-40">—</span>}</td>
                    <td>{t.color || <span className="opacity-40">—</span>}</td>
                    <td>{t.metrajeMinimo} m</td>
                    <td className="opacity-70">
                      {formatCurrency(t.precioBase)}
                      <span className="text-xs text-base-content/50 ml-1">({t.metrajeMinimo}m)</span>
                    </td>
                    <td className="font-bold text-primary">
                      {formatCurrency(pf)}
                      <span className="text-xs text-base-content/50 ml-1">({t.metrajeMinimo}m)</span>
                    </td>
                    <td>{t.peso.toFixed(3)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
