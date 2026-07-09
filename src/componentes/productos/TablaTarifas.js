"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { formatCurrency } from '@/utils/utilidades';
import { Download, Settings } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toastError } from '@/lib/toast';


export default function TablaTarifas() {
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');
  const [editandoLonas, setEditandoLonas] = useState(null); // { id, value }
  const [guardandoLonas, setGuardandoLonas] = useState(false);
  const [editandoAcabado, setEditandoAcabado] = useState(null); // { id, value }
  const [guardandoAcabado, setGuardandoAcabado] = useState(false);
  const [editandoPrecio, setEditandoPrecio] = useState(null); // { id, value }
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios');
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');

  const isLoading = tarifasLoading || margenesLoading;

  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);

  const handleGuardarLonas = async (row) => {
    if (guardandoLonas) return;
    const nuevoValor = editandoLonas.value === '' ? null : parseInt(editandoLonas.value, 10);
    if (nuevoValor === (row.lonas ?? null)) { setEditandoLonas(null); return; }
    setGuardandoLonas(true);
    try {
      await fetch('/api/precios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, material: row.material, espesor: row.espesor, precio: row.precio, peso: row.peso, color: row.color, lonas: nuevoValor, acabado: row.acabado }),
      });
      mutate('/api/precios');
    } finally {
      setGuardandoLonas(false);
      setEditandoLonas(null);
    }
  };

  const handleGuardarAcabado = async (row) => {
    if (guardandoAcabado) return;
    const nuevoValor = editandoAcabado.value.trim() || null;
    if (nuevoValor === (row.acabado ?? null)) { setEditandoAcabado(null); return; }
    setGuardandoAcabado(true);
    try {
      await fetch('/api/precios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, material: row.material, espesor: row.espesor, precio: row.precio, peso: row.peso, color: row.color, lonas: row.lonas, acabado: nuevoValor }),
      });
      mutate('/api/precios');
    } finally {
      setGuardandoAcabado(false);
      setEditandoAcabado(null);
    }
  };

  const handleGuardarPrecio = async (row) => {
    if (guardandoPrecio) return;
    const nuevoValor = parseFloat(editandoPrecio.value);
    if (isNaN(nuevoValor) || nuevoValor === row.precio) { setEditandoPrecio(null); return; }
    setGuardandoPrecio(true);
    try {
      await fetch('/api/precios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, material: row.material, espesor: row.espesor, precio: nuevoValor, peso: row.peso, color: row.color, lonas: row.lonas, acabado: row.acabado }),
      });
      mutate('/api/precios');
    } finally {
      setGuardandoPrecio(false);
      setEditandoPrecio(null);
    }
  };

  const uniqueMaterials = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    const materials = tarifas.map(t => t.material);
    return ['Todos', ...new Set(materials)].sort();
  }, [tarifas]);

  const filteredTarifas = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  const handleExportPDF = () => {
    if (filteredTarifas.length === 0) {
      toastError('No hay tarifas para exportar.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("Tabla de Tarifas de Materiales (por m²)", 14, 16);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const margenText = selectedMargin
      ? `Margen: ${selectedMargin.descripcion} (×${selectedMargin.multiplicador})`
      : 'Sin margen (precio base)';
    doc.text(`Filtro: ${selectedMaterial}   ·   ${margenText}   ·   Impreso el ${fecha}`, 14, 23);

    const tableColumn = ["Material", "Lonas", "Acabado", "Espesor (mm)", "Color", "Precio Base (€/m²)", "Precio Final (€/m²)", "Peso (kg/m²)"];
    const tableRows = filteredTarifas.map(row => {
      const finalPrice = row.precio * (selectedMargin?.multiplicador || 1);
      return [
        row.material,
        row.lonas != null ? String(row.lonas) : '—',
        row.acabado || '—',
        row.espesor.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        row.color || '—',
        row.precio.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €',
        finalPrice.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €',
        row.peso.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kg',
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 35, halign: 'right' },
      },
    });

    const fileName = selectedMaterial === 'Todos'
      ? `tarifas-m2-${new Date().toISOString().slice(0, 10)}.pdf`
      : `tarifa-m2-${selectedMaterial.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };


  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
          <div className="flex gap-2">
            {/* NUEVO: Botón de gestión */}
            <Link href="/configuracion">
              <button className="btn btn-neutral btn-sm">
                <Settings className="w-4 h-4" /> Gestionar Precios Base
              </button>
            </Link>
            {/* Existente: Botón de Imprimir */}
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary btn-sm"
              disabled={filteredTarifas.length === 0}
            >
              <Download className="w-4 h-4" /> Imprimir Tarifa
            </button>
          </div>
        </div>

        {/* Agrupamos los dos selectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Selector de Margen */}
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Simular Precio con Margen:</span></label>
            <select
              className="select select-bordered"
              value={selectedMarginId}
              onChange={(e) => setSelectedMarginId(e.target.value)}
            >
              <option value="">Precio Base (Sin Margen)</option>
              {margenes?.map(margen => {
                const tierText = margen.tierCliente ? ` (${margen.tierCliente})` : '';
                return (
                  <option key={margen.id} value={margen.id}>
                    {margen.descripcion}{tierText} (x{margen.multiplicador})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selector de Material */}
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Filtrar por Material:</span></label>
            <select
              className="select select-bordered"
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
            >
              {uniqueMaterials.map(material => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th className="text-center">Material</th>
                <th className="text-center">Lonas</th>
                <th className="text-center">Acabado</th>
                <th className="text-center">Espesor (mm)</th>
                <th className="text-center">Precio Base (€/m²)</th>
                <th className="text-center font-bold">Precio Final (€/m²)</th>
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas?.map(row => {
                const finalPrice = row.precio * (selectedMargin?.multiplicador || 1);
                const isEditing = editandoLonas?.id === row.id;
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>
                    <td className="text-center">
                      {isEditing ? (
                        <input
                          type="number" min="1" step="1"
                          className="input input-xs input-bordered w-16 font-mono text-center"
                          value={editandoLonas.value}
                          onChange={e => setEditandoLonas(prev => ({ ...prev, value: e.target.value }))}
                          onBlur={() => handleGuardarLonas(row)}
                          onKeyDown={e => { if (e.key === 'Enter') handleGuardarLonas(row); if (e.key === 'Escape') setEditandoLonas(null); }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary font-mono text-sm"
                          title="Clic para editar lonas"
                          onClick={() => setEditandoLonas({ id: row.id, value: row.lonas != null ? String(row.lonas) : '' })}
                        >
                          {row.lonas != null ? row.lonas : <span className="opacity-30 text-xs">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {editandoAcabado?.id === row.id ? (
                        <input
                          type="text"
                          placeholder="PVC/Tejido…"
                          className="input input-xs input-bordered w-28 text-center"
                          value={editandoAcabado.value}
                          onChange={e => setEditandoAcabado(prev => ({ ...prev, value: e.target.value }))}
                          onBlur={() => handleGuardarAcabado(row)}
                          onKeyDown={e => { if (e.key === 'Enter') handleGuardarAcabado(row); if (e.key === 'Escape') setEditandoAcabado(null); }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary text-sm"
                          title="Clic para editar acabado"
                          onClick={() => setEditandoAcabado({ id: row.id, value: row.acabado ?? '' })}
                        >
                          {row.acabado || <span className="opacity-30 text-xs">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-center">{row.espesor}</td>
                    <td className="text-center">
                      {editandoPrecio?.id === row.id ? (
                        <input
                          type="number" min="0" step="0.01"
                          className="input input-xs input-bordered w-20 font-mono text-center"
                          value={editandoPrecio.value}
                          onChange={e => setEditandoPrecio(prev => ({ ...prev, value: e.target.value }))}
                          onBlur={() => handleGuardarPrecio(row)}
                          onKeyDown={e => { if (e.key === 'Enter') handleGuardarPrecio(row); if (e.key === 'Escape') setEditandoPrecio(null); }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-primary font-mono text-sm opacity-70"
                          title="Clic para editar precio base"
                          onClick={() => setEditandoPrecio({ id: row.id, value: String(row.precio) })}
                        >
                          {formatCurrency(row.precio)}
                        </span>
                      )}
                    </td>
                    <td className="text-center font-bold text-primary">{formatCurrency(finalPrice)}</td>
                    <td className="text-center">{row.peso.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTarifas.length === 0 && selectedMaterial !== 'Todos' && (
            <div className="text-center py-4 text-gray-500">No hay tarifas para el material seleccionado.</div>
          )}
        </div>
      </div>
    </div>
  );
}