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
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');

  // Edición inline precio base
  const [editandoPrecio, setEditandoPrecio] = useState(null); // { id, value }
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  // Edición inline lonas
  const [editandoLonas, setEditandoLonas] = useState(null); // { id, value }
  const [guardandoLonas, setGuardandoLonas] = useState(false);

  // Edición inline acabado
  const [editandoAcabado, setEditandoAcabado] = useState(null); // { id, value }
  const [guardandoAcabado, setGuardandoAcabado] = useState(false);

  // Edición inline precio de venta por margen: { id, margenBase, value }
  const [editandoVenta, setEditandoVenta] = useState(null);
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios');
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');

  const isLoading = tarifasLoading || margenesLoading;

  // Solo márgenes con multiplicador (no gastoFijo)
  const margenesVenta = useMemo(() => {
    if (!Array.isArray(margenes)) return [];
    return margenes.filter(m => m.tipo !== 'gastoFijo' && m.multiplicador !== 1);
  }, [margenes]);

  const uniqueMaterials = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    return ['Todos', ...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filteredTarifas = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  // --- Handlers ---

  const guardarCampo = async (row, campoData) => {
    await fetch('/api/precios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        material: row.material,
        espesor: row.espesor,
        precio: row.precio,
        peso: row.peso,
        color: row.color,
        lonas: row.lonas,
        acabado: row.acabado,
        preciosVenta: row.preciosVenta ?? null,
        ...campoData,
      }),
    });
    mutate('/api/precios');
  };

  const handleGuardarPrecio = async (row) => {
    if (guardandoPrecio) return;
    const nuevoValor = parseFloat(editandoPrecio.value);
    if (isNaN(nuevoValor) || nuevoValor === row.precio) { setEditandoPrecio(null); return; }
    setGuardandoPrecio(true);
    try { await guardarCampo(row, { precio: nuevoValor }); }
    finally { setGuardandoPrecio(false); setEditandoPrecio(null); }
  };

  const handleGuardarLonas = async (row) => {
    if (guardandoLonas) return;
    const nuevoValor = editandoLonas.value === '' ? null : parseInt(editandoLonas.value, 10);
    if (nuevoValor === (row.lonas ?? null)) { setEditandoLonas(null); return; }
    setGuardandoLonas(true);
    try { await guardarCampo(row, { lonas: nuevoValor }); }
    finally { setGuardandoLonas(false); setEditandoLonas(null); }
  };

  const handleGuardarAcabado = async (row) => {
    if (guardandoAcabado) return;
    const nuevoValor = editandoAcabado.value.trim() || null;
    if (nuevoValor === (row.acabado ?? null)) { setEditandoAcabado(null); return; }
    setGuardandoAcabado(true);
    try { await guardarCampo(row, { acabado: nuevoValor }); }
    finally { setGuardandoAcabado(false); setEditandoAcabado(null); }
  };

  const handleGuardarVenta = async (row) => {
    if (guardandoVenta) return;
    const nuevoValor = parseFloat(editandoVenta.value);
    if (isNaN(nuevoValor) || nuevoValor <= 0) { setEditandoVenta(null); return; }
    const preciosActuales = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
    const calculado = row.precio * (margenesVenta.find(m => m.base === editandoVenta.margenBase)?.multiplicador ?? 1);
    // Si el valor coincide con el calculado, borrar la sobreescritura
    const nuevos = Math.abs(nuevoValor - calculado) < 0.001
      ? { ...preciosActuales, [editandoVenta.margenBase]: undefined }
      : { ...preciosActuales, [editandoVenta.margenBase]: nuevoValor };
    // Limpiar undefined
    Object.keys(nuevos).forEach(k => nuevos[k] === undefined && delete nuevos[k]);
    setGuardandoVenta(true);
    try { await guardarCampo(row, { preciosVenta: Object.keys(nuevos).length ? nuevos : null }); }
    finally { setGuardandoVenta(false); setEditandoVenta(null); }
  };

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
    doc.text(`Filtro: ${selectedMaterial}   ·   Impreso el ${fecha}`, 14, 23);

    const ventaCols = margenesVenta.map(m => `${m.descripcion} (€/m²)`);
    const tableColumn = ["Material", "Lonas", "Acabado", "Espesor (mm)", "Precio Base (€/m²)", ...ventaCols, "Peso (kg/m²)"];
    const tableRows = filteredTarifas.map(row => {
      const preciosMap = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
      const ventaVals = margenesVenta.map(m => {
        const v = preciosMap[m.base] ?? (row.precio * m.multiplicador);
        return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
      });
      return [
        row.material,
        row.lonas != null ? String(row.lonas) : '—',
        row.acabado || '—',
        row.espesor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        row.precio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
        ...ventaVals,
        row.peso.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg',
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
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
            <Link href="/configuracion">
              <button className="btn btn-neutral btn-sm">
                <Settings className="w-4 h-4" /> Gestionar Precios Base
              </button>
            </Link>
            <button
              onClick={handleExportPDF}
              className="btn btn-secondary btn-sm"
              disabled={filteredTarifas.length === 0}
            >
              <Download className="w-4 h-4" /> Imprimir Tarifa
            </button>
          </div>
        </div>

        <div className="form-control w-full max-w-xs mb-4">
          <label className="label"><span className="label-text font-bold">Filtrar por Material:</span></label>
          <select
            className="select select-bordered"
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
          >
            {uniqueMaterials.map(material => (
              <option key={material} value={material}>{material}</option>
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
                <th className="text-center" title="Clic para editar">Precio Base (€/m²)</th>
                {margenesVenta.map(m => (
                  <th key={m.base} className="text-center">
                    <span className="block text-xs font-bold">{m.descripcion}</span>
                    <span className="block text-xs font-normal opacity-60">×{m.multiplicador}</span>
                  </th>
                ))}
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas?.map(row => {
                const preciosMap = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>

                    {/* Lonas */}
                    <td className="text-center">
                      {editandoLonas?.id === row.id ? (
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

                    {/* Acabado */}
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

                    {/* Precio base editable */}
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

                    {/* Columnas de precio de venta por margen */}
                    {margenesVenta.map(m => {
                      const calculado = row.precio * m.multiplicador;
                      const manual = preciosMap[m.base];
                      const esManual = manual != null;
                      const valorMostrado = esManual ? manual : calculado;
                      const isEditing = editandoVenta?.id === row.id && editandoVenta?.margenBase === m.base;
                      return (
                        <td key={m.base} className="text-center">
                          {isEditing ? (
                            <input
                              type="number" min="0" step="0.01"
                              className="input input-xs input-bordered w-20 font-mono text-center"
                              value={editandoVenta.value}
                              onChange={e => setEditandoVenta(prev => ({ ...prev, value: e.target.value }))}
                              onBlur={() => handleGuardarVenta(row)}
                              onKeyDown={e => { if (e.key === 'Enter') handleGuardarVenta(row); if (e.key === 'Escape') setEditandoVenta(null); }}
                              autoFocus
                            />
                          ) : (
                            <span
                              className={`cursor-pointer hover:text-primary font-mono text-sm ${esManual ? 'font-bold text-primary' : ''}`}
                              title={esManual ? 'Precio manual (clic para editar)' : `Calculado: ${calculado.toFixed(2)} € (clic para fijar manualmente)`}
                              onClick={() => setEditandoVenta({ id: row.id, margenBase: m.base, value: valorMostrado.toFixed(2) })}
                            >
                              {formatCurrency(valorMostrado)}
                              {esManual && <span className="text-xs ml-1 opacity-60">✎</span>}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="text-center">{row.peso.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTarifas.length === 0 && selectedMaterial !== 'Todos' && (
            <div className="text-center py-4 text-gray-500">No hay tarifas para el material seleccionado.</div>
          )}
        </div>

        <p className="text-xs text-base-content/40 mt-2">
          Los precios en <span className="text-primary font-bold">azul negrita</span> están fijados manualmente. El resto se calculan automáticamente (precio base × multiplicador de margen). Clic en cualquier precio para editarlo.
        </p>
      </div>
    </div>
  );
}
