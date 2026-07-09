"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { formatCurrency } from '@/utils/utilidades';
import { Download, Settings, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toastError } from '@/lib/toast';

export default function TablaTarifasRollo() {
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState(null);

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

  // Cuántos rollos tienen precioBase desincronizado respecto a TarifaMaterial
  const desincronizados = useMemo(() => {
    if (!Array.isArray(tarifas)) return 0;
    return tarifas.filter(t => {
      if (t.precioM2 == null || !t.ancho) return false;
      const esperado = t.precioM2 * (t.ancho / 1000) * t.metrajeMinimo;
      return Math.abs(esperado - t.precioBase) >= 0.01;
    }).length;
  }, [tarifas]);

  const handleSincronizar = async () => {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await fetch('/api/tarifas-rollo/sync', { method: 'POST' });
      const data = await res.json();
      mutate('/api/tarifas-rollo');
      setResultadoSync(data);
    } catch {
      toastError('Error al sincronizar precios');
    } finally {
      setSincronizando(false);
    }
  };

  const handleExportPDF = () => {
    if (filteredTarifas.length === 0) { toastError('No hay tarifas para exportar.'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text('Tabla de Tarifas por Rollo / Metraje', 14, 16);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const margenText = selectedMargin ? `Margen: ${selectedMargin.descripcion} (×${selectedMargin.multiplicador})` : 'Sin margen (precio base)';
    doc.text(`Filtro: ${selectedMaterial}   ·   ${margenText}   ·   Impreso el ${fecha}`, 14, 23);
    const columns = ['Material', 'Espesor', 'Ancho', 'Color', 'Metros/rollo', '€/m² (tarifa)', 'Precio base rollo', 'Precio final rollo', 'Kilos/rollo'];
    const rows = filteredTarifas.map(t => {
      const precioBase = t.precioM2 != null && t.ancho
        ? t.precioM2 * (t.ancho / 1000) * t.metrajeMinimo
        : t.precioBase;
      const pf = precioBase * (selectedMargin?.multiplicador || 1);
      return [
        t.material, `${t.espesor} mm`, t.ancho ? `${t.ancho} mm` : '—', t.color || '—',
        `${t.metrajeMinimo} m`,
        t.precioM2 != null ? `${t.precioM2.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—',
        `${precioBase.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        `${pf.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        `${t.peso.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`,
      ];
    });
    autoTable(doc, {
      head: [columns], body: rows, startY: 28, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
    const suffix = new Date().toISOString().slice(0, 10);
    doc.save(selectedMaterial === 'Todos' ? `tarifas-rollo-${suffix}.pdf` : `tarifa-rollo-${selectedMaterial.toLowerCase()}-${suffix}.pdf`);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tarifas por Rollo / Metraje</h2>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={handleSincronizar}
              disabled={sincronizando}
              className={`btn btn-sm gap-1 ${desincronizados > 0 ? 'btn-warning' : 'btn-ghost'}`}
              title={desincronizados > 0 ? `${desincronizados} rollo(s) con precio desactualizado` : 'Precios sincronizados'}
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
              Actualizar precios
              {desincronizados > 0 && <span className="badge badge-error badge-xs">{desincronizados}</span>}
            </button>
            <Link href="/configuracion">
              <button className="btn btn-neutral btn-sm gap-1">
                <Settings className="w-4 h-4" /> Gestionar
              </button>
            </Link>
            <button onClick={handleExportPDF} className="btn btn-secondary btn-sm gap-1" disabled={filteredTarifas.length === 0}>
              <Download className="w-4 h-4" /> Imprimir tarifa
            </button>
          </div>
        </div>

        {resultadoSync && (
          <div className="alert alert-success py-2 text-sm mb-4">
            {resultadoSync.actualizados === 0
              ? 'Todos los precios ya estaban actualizados.'
              : `${resultadoSync.actualizados} rollo(s) actualizados correctamente.`}
            <button className="btn btn-xs btn-ghost ml-auto" onClick={() => setResultadoSync(null)}>✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Simular precio con margen:</span></label>
            <select className="select select-bordered" value={selectedMarginId} onChange={e => setSelectedMarginId(e.target.value)}>
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
            <select className="select select-bordered" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
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
                <th>Metros/rollo</th>
                <th title="Viene de Tarifas por m²">€/m² (tarifa)</th>
                <th>Precio base rollo</th>
                <th className="font-bold">Precio final rollo</th>
                <th>Kilos/rollo</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-base-content/40">Sin tarifas de rollo disponibles</td></tr>
              ) : filteredTarifas.map(t => {
                // Precio base siempre calculado desde TarifaMaterial
                const precioBase = t.precioM2 != null && t.ancho
                  ? t.precioM2 * (t.ancho / 1000) * t.metrajeMinimo
                  : t.precioBase;
                const pf = precioBase * (selectedMargin?.multiplicador || 1);
                const desincronizado = t.precioM2 != null && t.ancho && Math.abs(precioBase - t.precioBase) >= 0.01;
                return (
                  <tr key={t.id} className="hover">
                    <td className="font-bold">{t.material}</td>
                    <td>{t.espesor} mm</td>
                    <td>{t.ancho ? `${t.ancho} mm` : <span className="opacity-40">—</span>}</td>
                    <td>{t.color || <span className="opacity-40">—</span>}</td>
                    <td>{t.metrajeMinimo} m</td>
                    <td className="font-mono text-sm">
                      {t.precioM2 != null
                        ? t.precioM2.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
                        : <span className="opacity-40 text-xs">sin tarifa</span>}
                    </td>
                    <td className={`opacity-70 ${desincronizado ? 'text-warning' : ''}`}>
                      {formatCurrency(precioBase)}
                      <span className="text-xs text-base-content/50 ml-1">({t.metrajeMinimo}m)</span>
                      {desincronizado && <span className="text-xs ml-1" title="Precio almacenado difiere, pulsa Actualizar precios">⚠</span>}
                    </td>
                    <td className="font-bold text-primary">
                      {formatCurrency(pf)}
                      <span className="text-xs text-base-content/50 ml-1">({t.metrajeMinimo}m)</span>
                    </td>
                    <td>{t.peso.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-base-content/40 mt-2">
          El €/m² proviene de <strong>Tarifas por m²</strong>. El precio base del rollo se calcula como €/m² × ancho × metros.
          Si cambias el precio en Tarifas por m², pulsa <strong>Actualizar precios</strong> para sincronizar los rollos.
          Los precios de venta manuales no se modifican automáticamente.
        </p>
      </div>
    </div>
  );
}
