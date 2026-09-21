"use client";
import React, { useState, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { formatCurrency } from '@/utils/utilidades';
import { Download, Settings, Plus, X, Ruler, History } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toastError } from '@/lib/toast';
import ModalHistorialVenta from './ModalHistorialVenta';

const ANCHOS_DEFECTO = [300, 400, 500, 600];

export default function TablaTarifas() {
  const [selectedMaterial, setSelectedMaterial] = useState('Todos');
  const [anchosML, setAnchosML]                 = useState(ANCHOS_DEFECTO);
  const [nuevoAncho, setNuevoAncho]             = useState('');

  const [editandoPrecio, setEditandoPrecio]   = useState(null);
  const [editandoLonas, setEditandoLonas]     = useState(null);
  const [editandoAcabado, setEditandoAcabado] = useState(null);
  const [editandoVenta, setEditandoVenta]     = useState(null);
  const guardandoPrecioRef  = useRef(false);
  const guardandoLonasRef   = useRef(false);
  const guardandoAcabadoRef = useRef(false);
  const guardandoVentaRef   = useRef(false);
  const [historialVentaRow, setHistorialVentaRow] = useState(null);
  const [margenObjetivo, setMargenObjetivo]     = useState(30);
  const [aplicandoSugerencia, setAplicandoSugerencia] = useState(null);
  const aplicandoSugerenciaRef = useRef(false);

  const handleAplicarSugerencia = async (row, costeM2) => {
    if (aplicandoSugerenciaRef.current) return;
    aplicandoSugerenciaRef.current = true;
    const precioSugerido = parseFloat((costeM2 * (1 + margenObjetivo / 100)).toFixed(2));
    setAplicandoSugerencia(row.id);
    try { await guardarCampo(row, { precio: precioSugerido }); }
    catch (err) { toastError(err.message || 'Error al aplicar sugerencia'); }
    finally { aplicandoSugerenciaRef.current = false; setAplicandoSugerencia(null); }
  };

  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios');
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');
  const { data: tarifasCoste } = useSWR('/api/tarifas-coste');

  const isLoading = tarifasLoading || margenesLoading;

  const margenesVenta = useMemo(() => {
    if (!Array.isArray(margenes)) return [];
    return margenes.filter(m => m.tipo !== 'gastoFijo' && m.multiplicador !== 1);
  }, [margenes]);

  const costesMap = useMemo(() => {
    if (!Array.isArray(tarifasCoste)) return {};
    const map = {};
    tarifasCoste.forEach(t => {
      const key = `${t.material}_${t.espesor}_${t.color ?? ''}_${t.lonas ?? ''}_${t.acabado ?? ''}`;
      map[key] = t;
    });
    return map;
  }, [tarifasCoste]);

  const uniqueMaterials = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    return ['Todos', ...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const filteredTarifas = useMemo(() => {
    if (!Array.isArray(tarifas)) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  const guardarCampo = async (row, campoData) => {
    const res = await fetch('/api/precios', {
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
    if (!res.ok) throw new Error('Error al guardar precio');
    await mutate('/api/precios');
  };

  const handleGuardarPrecio = async (row) => {
    if (guardandoPrecioRef.current) return;
    guardandoPrecioRef.current = true;
    const nuevoValor = parseFloat(editandoPrecio.value);
    if (isNaN(nuevoValor) || nuevoValor === row.precio) { guardandoPrecioRef.current = false; setEditandoPrecio(null); return; }
    try { await guardarCampo(row, { precio: nuevoValor }); }
    catch (err) { toastError(err.message || 'Error al guardar precio'); }
    finally { guardandoPrecioRef.current = false; setEditandoPrecio(null); }
  };

  const handleGuardarLonas = async (row) => {
    if (guardandoLonasRef.current) return;
    guardandoLonasRef.current = true;
    const parsed = parseInt(editandoLonas.value, 10);
    const nuevoValor = editandoLonas.value === '' ? null : (isNaN(parsed) ? null : parsed);
    if (nuevoValor === (row.lonas ?? null)) { guardandoLonasRef.current = false; setEditandoLonas(null); return; }
    try { await guardarCampo(row, { lonas: nuevoValor }); }
    catch (err) { toastError(err.message || 'Error al guardar lonas'); }
    finally { guardandoLonasRef.current = false; setEditandoLonas(null); }
  };

  const handleGuardarAcabado = async (row) => {
    if (guardandoAcabadoRef.current) return;
    guardandoAcabadoRef.current = true;
    const nuevoValor = editandoAcabado.value.trim() || null;
    if (nuevoValor === (row.acabado ?? null)) { guardandoAcabadoRef.current = false; setEditandoAcabado(null); return; }
    try { await guardarCampo(row, { acabado: nuevoValor }); }
    catch (err) { toastError(err.message || 'Error al guardar acabado'); }
    finally { guardandoAcabadoRef.current = false; setEditandoAcabado(null); }
  };

  const handleGuardarVenta = async (row) => {
    if (guardandoVentaRef.current) return;
    guardandoVentaRef.current = true;
    const nuevoValor = parseFloat(editandoVenta.value);
    if (isNaN(nuevoValor) || nuevoValor <= 0) { guardandoVentaRef.current = false; setEditandoVenta(null); return; }
    const preciosActuales = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
    const calculado = row.precio * (margenesVenta.find(m => m.base === editandoVenta.margenBase)?.multiplicador ?? 1);
    const nuevos = Math.abs(nuevoValor - calculado) < 0.001
      ? { ...preciosActuales, [editandoVenta.margenBase]: undefined }
      : { ...preciosActuales, [editandoVenta.margenBase]: nuevoValor };
    Object.keys(nuevos).forEach(k => nuevos[k] === undefined && delete nuevos[k]);
    try { await guardarCampo(row, { preciosVenta: Object.keys(nuevos).length ? nuevos : null }); }
    catch (err) { toastError(err.message || 'Error al guardar precio de venta'); }
    finally { guardandoVentaRef.current = false; setEditandoVenta(null); }
  };

  const agregarAncho = () => {
    const v = parseInt(nuevoAncho, 10);
    if (!v || v <= 0 || v > 5000) return;
    if (!anchosML.includes(v)) setAnchosML(prev => [...prev, v].sort((a, b) => a - b));
    setNuevoAncho('');
  };

  const eliminarAncho = (ancho) => setAnchosML(prev => prev.filter(a => a !== ancho));

  const handleExportPDF = () => {
    if (filteredTarifas.length === 0) { toastError('No hay tarifas para exportar.'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmt2 = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Tarifas de Materiales — Precio por m²", 14, 16);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Filtro: ${selectedMaterial}   ·   Impreso el ${fecha}`, 14, 23);

    const ventaCols = margenesVenta.map(m => `${m.descripcion}\n(€/m²)`);
    const colsM2 = ["Material", "Lonas", "Acabado", "Espesor\n(mm)", "Precio base\n(€/m²)", ...ventaCols, "Peso\n(kg/m²)"];
    const rowsM2 = filteredTarifas.map(row => {
      const preciosMap = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
      const ventaVals = margenesVenta.map(m => {
        const v = preciosMap[m.base] ?? (row.precio * m.multiplicador);
        return fmt2(v) + ' €';
      });
      return [
        row.material,
        row.lonas != null ? String(row.lonas) : '—',
        row.acabado || '—',
        fmt2(row.espesor),
        fmt2(row.precio) + ' €',
        ...ventaVals,
        fmt2(row.peso ?? 0) + ' kg',
      ];
    });

    autoTable(doc, {
      head: [colsM2], body: rowsM2, startY: 28, theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    const y2 = doc.lastAutoTable.finalY + 9;
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("Precio en metro lineal:", 14, y2);
    doc.setFont("helvetica", "normal");
    doc.text("Precio ML (€/ml)  =  Precio m² (€/m²)  ×  (ancho en mm ÷ 1000)", 14, y2 + 5);

    const fileName = selectedMaterial === 'Todos'
      ? `tarifas-m2-${new Date().toISOString().slice(0, 10)}.pdf`
      : `tarifa-m2-${selectedMaterial.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (tarifasError || margenesError) return (
    <div role="alert" className="alert alert-error max-w-sm">
      <span>Error al cargar tarifas.</span>
    </div>
  );

  return (
    <>
      <ModalHistorialVenta row={historialVentaRow} onClose={() => setHistorialVentaRow(null)} />

      {/* Controls bar */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs font-semibold">Material</span>
            </label>
            <select
              className="select select-bordered select-sm min-w-36"
              value={selectedMaterial}
              onChange={e => setSelectedMaterial(e.target.value)}
            >
              {uniqueMaterials.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label py-0.5">
              <span className="label-text text-xs font-semibold">Margen objetivo</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number" min="1" max="200" step="1"
                className="input input-bordered input-sm w-20 font-mono"
                value={margenObjetivo}
                onChange={e => setMargenObjetivo(Math.max(1, parseInt(e.target.value) || 30))}
              />
              <span className="text-sm text-base-content/50">%</span>
            </div>
          </div>

          {selectedMaterial !== 'Todos' && (
            <span className="text-xs text-base-content/40 self-end pb-2">
              {filteredTarifas.length} referencia{filteredTarifas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end">
          <Link href="/configuracion">
            <button className="btn btn-ghost btn-sm gap-1">
              <Settings className="w-4 h-4" /> Precios base
            </button>
          </Link>
          <button
            onClick={handleExportPDF}
            className="btn btn-outline btn-sm gap-1"
            disabled={filteredTarifas.length === 0}
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Main table */}
      <div className="card bg-base-100 shadow border border-base-200 mb-6">
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              {/* Group header row */}
              <tr className="border-b-0 text-xs">
                <th colSpan={4} />
                {margenesVenta.length > 0 && (
                  <th
                    colSpan={margenesVenta.length}
                    className="text-center bg-primary/8 border-x border-primary/15 py-2"
                  >
                    <span className="font-semibold text-primary uppercase tracking-wider text-xs">
                      Precios de venta
                    </span>
                  </th>
                )}
                <th colSpan={3} />
                <th />
              </tr>
              {/* Column header row */}
              <tr className="bg-base-200/50 text-xs">
                <th>Material</th>
                <th>Espesor</th>
                <th>Variante</th>
                <th className="text-right">
                  Precio base
                  <span className="block font-normal opacity-50">€/m²</span>
                </th>
                {margenesVenta.map(m => (
                  <th key={m.base} className="text-right bg-primary/5 border-x border-primary/10">
                    <span className="block font-bold text-base-content/70">{m.descripcion}</span>
                    <span className="block font-normal opacity-50">×{m.multiplicador}</span>
                  </th>
                ))}
                <th className="text-right opacity-60">
                  Coste imp.
                  <span className="block font-normal">€/m²</span>
                </th>
                <th className="text-center opacity-60">Margen</th>
                <th className="text-right">
                  Peso
                  <span className="block font-normal opacity-50">kg/m²</span>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredTarifas.length === 0 ? (
                <tr>
                  <td colSpan={8 + margenesVenta.length} className="text-center py-10 text-base-content/40 text-sm">
                    No hay tarifas para el material seleccionado.
                  </td>
                </tr>
              ) : filteredTarifas.map(row => {
                const preciosMap = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
                const key = `${row.material}_${row.espesor}_${row.color ?? ''}_${row.lonas ?? ''}_${row.acabado ?? ''}`;
                const coste = costesMap[key];
                const costeM2 = coste?.precio ?? null;
                const margenPct = costeM2 > 0 ? ((row.precio - costeM2) / costeM2) * 100 : null;
                const precioSugerido = costeM2 != null
                  ? parseFloat((costeM2 * (1 + margenObjetivo / 100)).toFixed(2))
                  : null;
                const mostrarSugerencia = precioSugerido != null && (margenPct == null || margenPct < margenObjetivo);

                return (
                  <tr key={row.id} className="hover border-b border-base-200/60">

                    {/* Material */}
                    <td>
                      <span className="badge badge-ghost badge-sm font-semibold text-xs">
                        {row.material}
                      </span>
                    </td>

                    {/* Espesor */}
                    <td>
                      <span className="font-mono text-sm">{row.espesor} mm</span>
                    </td>

                    {/* Variante: lonas + acabado como badges editables */}
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        {editandoLonas?.id === row.id ? (
                          <input
                            type="number" min="1" step="1" autoFocus
                            className="input input-xs input-bordered w-16 font-mono text-center"
                            value={editandoLonas.value}
                            onChange={e => setEditandoLonas(prev => ({ ...prev, value: e.target.value }))}
                            onBlur={() => handleGuardarLonas(row)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleGuardarLonas(row);
                              if (e.key === 'Escape') setEditandoLonas(null);
                            }}
                          />
                        ) : (
                          <span
                            className={`badge badge-sm cursor-pointer hover:badge-primary transition-colors ${
                              row.lonas != null ? 'badge-neutral' : 'badge-ghost opacity-40 hover:opacity-100'
                            }`}
                            title="Editar lonas"
                            onClick={() => setEditandoLonas({ id: row.id, value: row.lonas != null ? String(row.lonas) : '' })}
                          >
                            {row.lonas != null ? `${row.lonas}L` : '+ lonas'}
                          </span>
                        )}

                        {editandoAcabado?.id === row.id ? (
                          <input
                            type="text" placeholder="acabado…" autoFocus
                            className="input input-xs input-bordered w-24 text-center"
                            value={editandoAcabado.value}
                            onChange={e => setEditandoAcabado(prev => ({ ...prev, value: e.target.value }))}
                            onBlur={() => handleGuardarAcabado(row)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleGuardarAcabado(row);
                              if (e.key === 'Escape') setEditandoAcabado(null);
                            }}
                          />
                        ) : (
                          <span
                            className={`badge badge-sm cursor-pointer hover:badge-secondary transition-colors ${
                              row.acabado ? 'badge-outline' : 'badge-ghost opacity-40 hover:opacity-100'
                            }`}
                            title="Editar acabado"
                            onClick={() => setEditandoAcabado({ id: row.id, value: row.acabado ?? '' })}
                          >
                            {row.acabado || '+ acabado'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Precio base editable */}
                    <td className="text-right">
                      {editandoPrecio?.id === row.id ? (
                        <input
                          type="number" min="0" step="0.01" autoFocus
                          className="input input-xs input-bordered w-20 font-mono text-right"
                          value={editandoPrecio.value}
                          onChange={e => setEditandoPrecio(prev => ({ ...prev, value: e.target.value }))}
                          onBlur={() => handleGuardarPrecio(row)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleGuardarPrecio(row);
                            if (e.key === 'Escape') setEditandoPrecio(null);
                          }}
                        />
                      ) : (
                        <span
                          className="font-mono text-sm cursor-pointer hover:text-primary transition-colors"
                          title="Clic para editar precio base"
                          onClick={() => setEditandoPrecio({ id: row.id, value: String(row.precio) })}
                        >
                          {formatCurrency(row.precio)}
                        </span>
                      )}
                    </td>

                    {/* Precios de venta por margen */}
                    {margenesVenta.map(m => {
                      const calculado = row.precio * m.multiplicador;
                      const manual = preciosMap[m.base];
                      const esManual = manual != null;
                      const valorMostrado = esManual ? manual : calculado;
                      const isEditing = editandoVenta?.id === row.id && editandoVenta?.margenBase === m.base;
                      return (
                        <td key={m.base} className="text-right bg-primary/5 border-x border-primary/8">
                          {isEditing ? (
                            <input
                              type="number" min="0" step="0.01" autoFocus
                              className="input input-xs input-bordered w-20 font-mono text-right"
                              value={editandoVenta.value}
                              onChange={e => setEditandoVenta(prev => ({ ...prev, value: e.target.value }))}
                              onBlur={() => handleGuardarVenta(row)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleGuardarVenta(row);
                                if (e.key === 'Escape') setEditandoVenta(null);
                              }}
                            />
                          ) : (
                            <span
                              className={`font-mono text-sm cursor-pointer hover:text-primary transition-colors ${
                                esManual ? 'font-bold text-primary' : ''
                              }`}
                              title={esManual
                                ? 'Precio manual (clic para editar)'
                                : `Calculado ×${m.multiplicador} (clic para fijar manualmente)`}
                              onClick={() => setEditandoVenta({ id: row.id, margenBase: m.base, value: valorMostrado.toFixed(2) })}
                            >
                              {formatCurrency(valorMostrado)}
                              {esManual && <span className="ml-1 opacity-50 text-xs">✎</span>}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Coste importación */}
                    <td className="text-right font-mono text-sm text-base-content/40">
                      {costeM2 != null
                        ? formatCurrency(costeM2)
                        : <span className="opacity-25">—</span>}
                    </td>

                    {/* Margen % como badge de color */}
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`badge badge-sm font-mono font-bold ${
                          margenPct == null        ? 'badge-ghost opacity-30' :
                          margenPct >= margenObjetivo ? 'badge-success' :
                          margenPct >= 10          ? 'badge-warning' : 'badge-error'
                        }`}>
                          {margenPct != null
                            ? `${margenPct >= 0 ? '+' : ''}${margenPct.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                            : '—'}
                        </span>
                        {mostrarSugerencia && (
                          <button
                            className="btn btn-xs btn-outline btn-warning"
                            title={`Aplicar precio al ${margenObjetivo}% de margen`}
                            disabled={aplicandoSugerencia === row.id}
                            onClick={() => handleAplicarSugerencia(row, costeM2)}
                          >
                            {aplicandoSugerencia === row.id
                              ? <span className="loading loading-spinner loading-xs" />
                              : `→ ${formatCurrency(precioSugerido)}`}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Peso */}
                    <td className="text-right font-mono text-sm">
                      {(row.peso ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                    </td>

                    {/* Historial */}
                    <td>
                      <button
                        className="btn btn-ghost btn-xs"
                        title="Ver historial de precio de venta"
                        onClick={() => setHistorialVentaRow(row)}
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-base-200">
          <p className="text-xs text-base-content/40">
            Precios en <span className="text-primary font-semibold">azul</span> están fijados manualmente; el resto se calculan automáticamente (precio base × multiplicador). Clic en cualquier celda para editarla.
          </p>
        </div>
      </div>

      {/* ── Conversión a Metro Lineal ───────────────────────────────── */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-base">
                <Ruler className="w-4 h-4 text-primary" /> Conversión a Metro Lineal
              </h3>
              <p className="text-xs text-base-content/50 mt-0.5">
                Precio ML = Precio m² × (ancho mm ÷ 1000) — incluido en el PDF
              </p>
            </div>
            <div className="flex gap-2 items-center shrink-0">
              <input
                type="number"
                className="input input-bordered input-sm w-28"
                placeholder="Ancho mm"
                value={nuevoAncho}
                min="1" max="5000" step="1"
                onChange={e => setNuevoAncho(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarAncho()}
              />
              <button
                className="btn btn-sm btn-primary gap-1"
                onClick={agregarAncho}
                disabled={!nuevoAncho}
              >
                <Plus className="w-3 h-3" /> Añadir
              </button>
            </div>
          </div>

          {/* Chips de anchos */}
          <div className="flex flex-wrap gap-2 mb-4">
            {anchosML.map(ancho => (
              <span key={ancho} className="badge badge-outline gap-1 pr-1">
                {ancho} mm
                <button
                  className="hover:text-error ml-0.5 transition-colors"
                  onClick={() => eliminarAncho(ancho)}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {anchosML.length === 0 && (
              <span className="text-xs text-base-content/30">
                Añade al menos un ancho para ver la tabla
              </span>
            )}
          </div>

          {anchosML.length > 0 && filteredTarifas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra w-full">
                <thead>
                  <tr className="text-xs text-base-content/50">
                    <th>Material</th>
                    <th className="text-center">Lonas</th>
                    <th className="text-center">Espesor</th>
                    {anchosML.flatMap(ancho =>
                      margenesVenta.map(m => (
                        <th key={`${ancho}-${m.base}`} className="text-right whitespace-nowrap">
                          <span className="block font-semibold text-primary">{m.descripcion}</span>
                          <span className="block text-base-content/40 font-normal">@ {ancho} mm · €/ml</span>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTarifas.map(row => {
                    const preciosMap = (typeof row.preciosVenta === 'object' && row.preciosVenta) ? row.preciosVenta : {};
                    return (
                      <tr key={row.id} className="hover">
                        <td className="font-semibold">{row.material}</td>
                        <td className="text-center text-sm">{row.lonas ?? <span className="opacity-30">—</span>}</td>
                        <td className="text-center font-mono text-sm">{row.espesor} mm</td>
                        {anchosML.flatMap((ancho, ai) =>
                          margenesVenta.map(m => {
                            const pm2 = preciosMap[m.base] ?? (row.precio * m.multiplicador);
                            const ml  = pm2 * (ancho / 1000);
                            return (
                              <td
                                key={`${ancho}-${m.base}`}
                                className={`text-right font-mono font-semibold${ai % 2 === 0 ? ' bg-primary/5' : ''}`}
                              >
                                {ml.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
