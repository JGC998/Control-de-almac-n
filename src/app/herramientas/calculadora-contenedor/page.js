"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Package2, Plus, Trash2, Info, Save, History, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetcher } from '@/lib/fetcher';

const nuevaBobina = (id) => ({
  id,
  tipo: 'BOBINA', // 'BOBINA' | 'TACO' | 'GRAPA' | 'MAQUINA' | 'OTRO'
  referencia: '',
  espesor: '',
  ancho: '',
  longitud: '',
  numRollos: '1',
  precio: '',
  unidadPrecio: 'M', // 'M' = USD/metro lineal | 'SQM' = USD/m² (solo BOBINA)
});

const n = (v) => parseFloat(v) || 0;
const fmt = (v, dec = 2) => isFinite(v) ? v.toFixed(dec) : '0.00';
const fmtEur = (v) => `${fmt(v)} €`;
const fmtUsd = (v) => `${fmt(v)} $`;

function ModalGuardar({ datos, onClose }) {
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/importaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, descripcion: descripcion.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      mutate('/api/importaciones');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg mb-4">Guardar importación</h3>

        <div className="space-y-3 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Bobinas</p>
              <p className="font-mono font-bold">{fmtEur(datos.totalBobinasEUR)}</p>
              <p className="text-xs text-base-content/40">{fmtUsd(datos.totalBobinasUSD)}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Coste producto</p>
              <p className="font-mono font-bold text-success">{fmtEur(datos.costeProducto)}</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">Metros totales</p>
              <p className="font-mono font-bold">{fmt(datos.totalMetros, 0)} m</p>
            </div>
            <div className="bg-base-200 rounded p-2">
              <p className="text-xs text-base-content/50">€ / metro medio</p>
              <p className="font-mono font-bold text-success">
                {datos.totalMetros > 0 ? fmtEur(datos.costeProducto / datos.totalMetros) : '—'}/m
              </p>
            </div>
          </div>
        </div>

        <div className="form-control mb-4">
          <label className="label py-1"><span className="label-text text-sm">Descripción (opcional)</span></label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="Ej: Contenedor enero 2026, proveedor X"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {error && <div className="alert alert-error py-2 text-sm mb-3">{error}</div>}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialImportaciones({ onCargar }) {
  const { data: importaciones, isLoading } = useSWR('/api/importaciones', fetcher);
  const [abierto, setAbierto] = useState(false);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta importación del historial?')) return;
    await fetch(`/api/importaciones/${id}`, { method: 'DELETE' });
    mutate('/api/importaciones');
  };

  return (
    <div className="card bg-base-200 shadow-sm mt-6">
      <div className="card-body p-4">
        <button className="flex items-center justify-between w-full text-left" onClick={() => setAbierto(p => !p)}>
          <h2 className="font-bold text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Historial de importaciones guardadas
            {importaciones?.length > 0 && <span className="badge badge-ghost badge-sm">{importaciones.length}</span>}
          </h2>
          {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {abierto && (
          <div className="mt-4">
            {isLoading && <span className="loading loading-spinner loading-sm" />}
            {!isLoading && importaciones?.length === 0 && (
              <p className="text-sm text-base-content/40">No hay importaciones guardadas todavía.</p>
            )}
            {importaciones?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th className="text-right">TC</th>
                      <th className="text-right">Suplidos</th>
                      <th className="text-right">Exentos</th>
                      <th className="text-right">Sujetos</th>
                      <th className="text-right">Coste producto</th>
                      <th className="text-right">€/metro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {importaciones.map(imp => (
                      <tr key={imp.id} className="hover">
                        <td className="text-xs text-base-content/50 whitespace-nowrap">
                          {new Date(imp.creadaEn).toLocaleDateString('es-ES')}
                        </td>
                        <td className="max-w-xs truncate text-sm">{imp.descripcion || <span className="text-base-content/30">Sin descripción</span>}</td>
                        <td className="text-right font-mono text-xs">{fmt(imp.tasaCambio, 4)}</td>
                        <td className="text-right font-mono text-xs">{fmtEur(imp.suplidos)}</td>
                        <td className="text-right font-mono text-xs">{fmtEur(imp.exentos)}</td>
                        <td className="text-right font-mono text-xs text-base-content/40">{fmtEur(imp.sujetos)}</td>
                        <td className="text-right font-mono font-bold text-success">{fmtEur(imp.costeProducto)}</td>
                        <td className="text-right font-mono font-bold text-success">
                          {imp.totalMetros > 0 ? fmtEur(imp.costeProducto / imp.totalMetros) + '/m' : '—'}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-xs btn-ghost"
                              title="Cargar estos datos en la calculadora"
                              onClick={() => onCargar(imp)}
                            >
                              Cargar
                            </button>
                            <button
                              className="btn btn-xs btn-ghost text-error"
                              onClick={() => handleDelete(imp.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalculadoraContenedorPage() {
  const [tasaCambio, setTasaCambio] = useState('0.9300');
  const [bobinas, setBobinas] = useState([nuevaBobina(1)]);
  const [suplidos, setSuplidos] = useState('');
  const [exentos, setExentos] = useState('');
  const [sujetos, setSujetos] = useState('');
  const [nextId, setNextId] = useState(2);
  const [modalGuardar, setModalGuardar] = useState(false);

  const tc = n(tasaCambio);

  // --- Cálculos artículos ---
  const bobinasCals = bobinas.map(b => {
    const tipo = b.tipo || 'BOBINA';
    const precio = n(b.precio ?? b.usdPorMetro);
    const numRollos = Math.max(n(b.numRollos), 1);
    const longitud = n(b.longitud);
    const anchoM = n(b.ancho) / 1000;

    let totalMetrosBobina = 0;
    let subtotalUSD = 0;
    let usdPorMetro = 0;

    if (tipo === 'TACO') {
      // cantidad en metros × USD/m  (numRollos implícito = 1)
      totalMetrosBobina = longitud;
      subtotalUSD = precio * longitud;
      usdPorMetro = precio;
    } else if (tipo === 'GRAPA') {
      // nº cajas × USD/caja  (longitud no aplica)
      subtotalUSD = precio * numRollos;
    } else if (tipo === 'MAQUINA' || tipo === 'OTRO') {
      // cantidad × USD/unidad
      subtotalUSD = precio * numRollos;
    } else {
      // BOBINA (default): puede ser $/M o $/M²
      usdPorMetro = b.unidadPrecio === 'SQM' ? precio * anchoM : precio;
      totalMetrosBobina = longitud * numRollos;
      subtotalUSD = usdPorMetro * totalMetrosBobina;
    }

    const subtotalEUR = subtotalUSD * tc;
    return { ...b, tipo, longitud, numRollos, anchoM, usdPorMetro, totalMetrosBobina, subtotalUSD, subtotalEUR };
  });

  const totalBobinasUSD = bobinasCals.reduce((s, b) => s + b.subtotalUSD, 0);
  const totalBobinasEUR = totalBobinasUSD * tc;
  const totalMetros = bobinasCals.reduce((s, b) => s + b.totalMetrosBobina, 0);

  // --- Gastos ---
  const supl = n(suplidos);
  const exen = n(exentos);
  const suj = n(sujetos);
  const ivaGastos = suj * 0.21;

  // REGLA: suplidos + exentos se repercuten. Sujetos NUNCA entra en el cálculo.
  const gastosRepercutibles = supl + exen;
  const costeProducto = totalBobinasEUR + gastosRepercutibles;
  const totalDesembolso = totalBobinasEUR + supl + exen + suj + ivaGastos;

  // --- Prorrateo por valor ---
  const bobinasFinal = bobinasCals.map(b => {
    if (totalBobinasEUR === 0 || b.subtotalEUR === 0) {
      return { ...b, proporcion: 0, gastosProrrateados: 0, costeFinalEUR: b.subtotalEUR, costePorMetro: 0 };
    }
    const proporcion = b.subtotalEUR / totalBobinasEUR;
    const gastosProrrateados = gastosRepercutibles * proporcion;
    const costeFinalEUR = b.subtotalEUR + gastosProrrateados;
    const costePorMetro = b.totalMetrosBobina > 0 ? costeFinalEUR / b.totalMetrosBobina : 0;
    return { ...b, proporcion, gastosProrrateados, costeFinalEUR, costePorMetro };
  });

  const handleBobinaChange = (id, field, value) => {
    setBobinas(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addBobina = () => {
    setBobinas(prev => [...prev, nuevaBobina(nextId)]);
    setNextId(id => id + 1);
  };

  const removeBobina = (id) => {
    if (bobinas.length > 1) setBobinas(prev => prev.filter(b => b.id !== id));
  };

  const handleCargarImportacion = (imp) => {
    try {
      const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
      if (!Array.isArray(bobs)) throw new Error('Formato inválido');
      setBobinas(bobs.map((b, i) => ({
        ...b,
        id: i + 1,
        tipo: b.tipo || 'BOBINA',
        precio: b.precio ?? b.usdPorMetro ?? '',
        unidadPrecio: b.unidadPrecio || 'M',
      })));
      setNextId(bobs.length + 1);
      setTasaCambio(String(imp.tasaCambio));
      setSuplidos(String(imp.suplidos));
      setExentos(String(imp.exentos));
      setSujetos(String(imp.sujetos));
    } catch {
      alert('No se pudieron cargar los datos de esta importación.');
    }
  };

  const hayResultados = bobinasFinal.some(b => b.subtotalEUR > 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    // ── CABECERA ──
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORME DE IMPORTACIÓN', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, y);
    doc.text(`1 USD = ${fmt(tc, 4)} EUR`, pageW - margin, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(180); doc.line(margin, y, pageW - margin, y);
    y += 8;

    // ── TABLA DE ARTÍCULOS ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Artículos del pedido', margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Referencia', 'Tipo', 'Detalle', 'Cant./Metros', 'Total USD', 'Total EUR']],
      body: bobinasCals.map(b => {
        const tipo = b.tipo || 'BOBINA';
        let detalle = '—';
        if (tipo === 'BOBINA' && (b.espesor || b.ancho)) {
          detalle = [b.espesor && `${b.espesor}mm`, b.ancho && `${b.ancho}mm ancho`].filter(Boolean).join(' · ');
        } else if (tipo === 'GRAPA' && b.ancho) {
          detalle = `${b.ancho}mm ancho`;
        }
        let cantMetros = '';
        if (tipo === 'BOBINA' || tipo === 'TACO') {
          cantMetros = (b.numRollos > 1 && tipo === 'BOBINA')
            ? `${b.numRollos}×${fmt(b.longitud, 0)} = ${fmt(b.totalMetrosBobina, 0)} m`
            : `${fmt(b.totalMetrosBobina, 0)} m`;
        } else {
          const uLabel = tipo === 'GRAPA' ? 'caj.' : 'ud.';
          cantMetros = `${b.numRollos} ${uLabel}`;
        }
        return [b.referencia || '—', tipo, detalle, cantMetros, fmtUsd(b.subtotalUSD), fmtEur(b.subtotalEUR)];
      }),
      foot: [['', '', '', 'TOTAL', fmtUsd(totalBobinasUSD), fmtEur(totalBobinasEUR)]],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [220, 220, 235], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 32 }, 1: { cellWidth: 20 }, 2: { cellWidth: 38 },
        3: { cellWidth: 38 }, 4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── GASTOS DE IMPORTACIÓN ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Gastos de importación', margin, y);
    y += 5;
    const gastosBody = [
      ['Suplidos (repercute en coste)', fmtEur(supl)],
      ['Exentos / Aranceles (repercute en coste)', fmtEur(exen)],
    ];
    if (suj > 0) {
      gastosBody.push(['Sujetos — transporte nacional (no repercute)', fmtEur(suj)]);
      gastosBody.push(['IVA sujetos 21% (deducible)', fmtEur(ivaGastos)]);
    }
    gastosBody.push(['Gastos repercutibles totales', fmtEur(gastosRepercutibles)]);
    autoTable(doc, {
      startY: y,
      body: gastosBody,
      theme: 'plain',
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── RESUMEN FINAL ──
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Resumen', margin, y);
    y += 5;
    const resumenBody = [
      ['Coste total artículos (convertido a EUR)', fmtEur(totalBobinasEUR)],
      ['+ Gastos repercutibles (suplidos + exentos)', fmtEur(gastosRepercutibles)],
      ['= COSTE PRODUCTO', fmtEur(costeProducto)],
      ['Total desembolso real (incluyendo IVA sujetos)', fmtEur(totalDesembolso)],
    ];
    if (totalMetros > 0) {
      resumenBody.push(['Total metros lineales (bobinas + tacos)', `${fmt(totalMetros, 0)} m`]);
      resumenBody.push(['Coste medio por metro lineal', `${fmtEur(costeProducto / totalMetros)}/m`]);
    }
    autoTable(doc, {
      startY: y,
      body: resumenBody,
      theme: 'plain',
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
        }
      },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── DESGLOSE POR ARTÍCULO ──
    const artConValor = bobinasFinal.filter(b => b.subtotalEUR > 0);
    if (artConValor.length > 0) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Desglose de gastos por artículo', margin, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Referencia', 'Tipo', '% Valor', 'Gastos repartidos', 'Coste final EUR', '€/metro o ud.']],
        body: artConValor.map((b, idx) => {
          const tipo = b.tipo || 'BOBINA';
          const costeUd = b.costePorMetro > 0
            ? `${fmtEur(b.costePorMetro)}/m`
            : (b.costeFinalEUR > 0 && b.numRollos > 0 ? `${fmtEur(b.costeFinalEUR / b.numRollos)}/ud` : '—');
          return [
            b.referencia || `A${idx + 1}`,
            tipo,
            `${fmt(totalBobinasEUR > 0 ? b.subtotalEUR / totalBobinasEUR * 100 : 0, 1)}%`,
            fmtEur(b.gastosProrrateados),
            fmtEur(b.costeFinalEUR),
            costeUd,
          ];
        }),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 32 }, 1: { cellWidth: 20 },
          2: { cellWidth: 18, halign: 'right' }, 3: { cellWidth: 34, halign: 'right' },
          4: { cellWidth: 34, halign: 'right' }, 5: { cellWidth: 34, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
    }

    // Footer en cada página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
      doc.text(
        `CRM Taller — Informe de Importación — ${new Date().toLocaleDateString('es-ES')} — Pág. ${i}/${pageCount}`,
        pageW / 2, 290, { align: 'center' }
      );
      doc.setTextColor(0);
    }

    doc.save(`importacion-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const datosParaGuardar = {
    tasaCambio: tc,
    totalBobinasUSD,
    totalBobinasEUR,
    totalMetros,
    suplidos: supl,
    exentos: exen,
    sujetos: suj,
    gastosRepercutibles,
    costeProducto,
    totalDesembolso,
    bobinas: JSON.stringify(bobinas),
  };

  return (
    <div className="container mx-auto p-4 max-w-screen-xl print-contenedor">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Package2 className="w-8 h-8 text-warning" />
          <div>
            <h1 className="text-3xl font-bold">Calculadora de Contenedor</h1>
            <p className="text-sm text-base-content/60">Coste real de importación por artículo, prorrateado por valor económico</p>
          </div>
        </div>
        {hayResultados && (
          <div className="flex gap-2">
            <button className="btn btn-outline btn-sm gap-2" onClick={handleExportPDF}>
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
            <button className="btn btn-success btn-sm gap-2" onClick={() => setModalGuardar(true)}>
              <Save className="w-4 h-4" /> Guardar importación
            </button>
          </div>
        )}
      </div>

      {/* ── FRANJA SUPERIOR: TC + Resumen ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
        {/* Tipo de cambio */}
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body p-4">
            <h2 className="font-bold text-sm mb-2 text-base-content/60 uppercase tracking-wide">Tipo de cambio</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">1 USD =</span>
              <input
                type="number" step="0.0001" min="0.0001"
                value={tasaCambio}
                onChange={e => setTasaCambio(e.target.value)}
                className="input input-bordered input-sm w-28 font-mono"
              />
              <span className="font-mono text-sm">EUR</span>
            </div>
            {tc > 0 && <p className="text-xs text-base-content/40 mt-1">1 EUR = {fmt(1/tc, 4)} USD</p>}
          </div>
        </div>

        {/* Resumen compacto */}
        <div className="lg:col-span-3 card bg-primary text-primary-content shadow-lg">
          <div className="card-body p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
              <div>
                <p className="text-xs opacity-70">Artículos</p>
                <p className="font-mono font-bold">{fmtEur(totalBobinasEUR)}</p>
                <p className="text-xs opacity-50">{fmtUsd(totalBobinasUSD)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Gastos repercutidos</p>
                <p className="font-mono font-bold">{fmtEur(gastosRepercutibles)}</p>
                <p className="text-xs opacity-50">Supl. {fmtEur(supl)} + Exen. {fmtEur(exen)}</p>
              </div>
              <div className="border-l border-primary-content/20 pl-4">
                <p className="text-xs opacity-70">Coste producto</p>
                <p className="font-mono text-2xl font-bold">{fmtEur(costeProducto)}</p>
                <p className="text-xs opacity-50">Desembolso total: {fmtEur(totalDesembolso)}</p>
              </div>
              <div className="border-l border-primary-content/20 pl-4">
                <p className="text-xs opacity-70">Total metros</p>
                <p className="font-mono font-bold">{fmt(totalMetros, 0)} m</p>
                {totalMetros > 0 && (
                  <>
                    <p className="text-xs opacity-70 mt-1">Coste medio</p>
                    <p className="font-mono text-lg font-bold">{fmtEur(costeProducto / totalMetros)}/m</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ARTÍCULOS DEL PEDIDO — ancho completo ── */}
      <div className="card bg-base-200 shadow-sm mb-5">
        <div className="card-body p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base">Artículos del pedido — datos de la factura del proveedor</h2>
            <button onClick={addBobina} className="btn btn-sm btn-primary gap-1">
              <Plus className="w-4 h-4" /> Añadir artículo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Esp.<br/><span className="font-normal opacity-60">(mm)</span></th>
                  <th>Ancho<br/><span className="font-normal opacity-60">(mm)</span></th>
                  <th>Long./Metros<br/><span className="font-normal opacity-60">(m)</span></th>
                  <th>Rollos/<br/><span className="font-normal opacity-60">Cajas/Ud.</span></th>
                  <th>Precio<br/><span className="font-normal opacity-60">USD/unidad</span></th>
                  <th className="text-right">Total m</th>
                  <th className="text-right">Total $</th>
                  <th className="text-right">Total €</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bobinas.map((b, idx) => {
                  const cal = bobinasCals[idx];
                  const tipo = b.tipo || 'BOBINA';
                  const esBobina = tipo === 'BOBINA';
                  const esTaco   = tipo === 'TACO';
                  const esGrapa  = tipo === 'GRAPA';
                  const esMaquina = tipo === 'MAQUINA' || tipo === 'OTRO';
                  return (
                    <tr key={b.id}>
                      {/* Tipo */}
                      <td>
                        <select
                          className="select select-xs select-bordered w-24"
                          value={tipo}
                          onChange={e => handleBobinaChange(b.id, 'tipo', e.target.value)}
                        >
                          <option value="BOBINA">Bobina</option>
                          <option value="TACO">Taco</option>
                          <option value="GRAPA">Grapa</option>
                          <option value="MAQUINA">Máquina</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </td>
                      {/* Referencia */}
                      <td>
                        <input
                          type="text" placeholder={`A${idx + 1}`}
                          value={b.referencia}
                          onChange={e => handleBobinaChange(b.id, 'referencia', e.target.value)}
                          className="input input-xs input-bordered w-24"
                        />
                      </td>
                      {/* Espesor — solo BOBINA */}
                      <td>
                        {esBobina
                          ? <input type="number" step="0.1" min="0" placeholder="—"
                              value={b.espesor}
                              onChange={e => handleBobinaChange(b.id, 'espesor', e.target.value)}
                              className="input input-xs input-bordered w-20 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Ancho — BOBINA, TACO y GRAPA */}
                      <td>
                        {(esBobina || esTaco || esGrapa)
                          ? <input type="number" step="1" min="0" placeholder="—"
                              value={b.ancho}
                              onChange={e => handleBobinaChange(b.id, 'ancho', e.target.value)}
                              className="input input-xs input-bordered w-20 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Longitud/Metros — BOBINA y TACO */}
                      <td>
                        {(esBobina || esTaco)
                          ? <input type="number" step="1" min="0" placeholder="0"
                              value={b.longitud}
                              onChange={e => handleBobinaChange(b.id, 'longitud', e.target.value)}
                              className="input input-xs input-bordered w-24 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Rollos / Cajas / Cantidad — todo excepto TACO */}
                      <td>
                        {!esTaco
                          ? <input type="number" step="1" min="1" placeholder="1"
                              value={b.numRollos}
                              onChange={e => handleBobinaChange(b.id, 'numRollos', e.target.value)}
                              className="input input-xs input-bordered w-16 font-mono"
                            />
                          : <span className="text-base-content/20 text-xs px-2">—</span>}
                      </td>
                      {/* Precio */}
                      <td>
                        <div>
                          <div className="join">
                            <input
                              type="number" step="0.0001" min="0" placeholder="0.0000"
                              value={b.precio}
                              onChange={e => handleBobinaChange(b.id, 'precio', e.target.value)}
                              className="input input-xs input-bordered join-item w-32 font-mono"
                            />
                            {esBobina
                              ? <select
                                  className="select select-xs join-item border-base-300 bg-base-100 font-mono w-20"
                                  value={b.unidadPrecio}
                                  onChange={e => handleBobinaChange(b.id, 'unidadPrecio', e.target.value)}
                                >
                                  <option value="M">$/M</option>
                                  <option value="SQM">$/M²</option>
                                </select>
                              : <span className="join-item flex items-center px-2 border border-base-300 bg-base-200 text-xs font-mono whitespace-nowrap">
                                  {esGrapa ? '$/caja' : esMaquina ? '$/ud' : '$/M'}
                                </span>}
                          </div>
                          {esBobina && b.unidadPrecio === 'SQM' && n(b.ancho) > 0 && n(b.precio) > 0 && (
                            <p className="text-[10px] text-base-content/50 font-mono mt-0.5">
                              ≈{fmt(n(b.precio) * n(b.ancho) / 1000, 4)} $/M
                            </p>
                          )}
                          {esBobina && b.unidadPrecio === 'SQM' && !n(b.ancho) && (
                            <p className="text-[10px] text-warning mt-0.5">↑ falta ancho</p>
                          )}
                        </div>
                      </td>
                      {/* Total m */}
                      <td className="text-right font-mono text-sm">
                        {cal.totalMetrosBobina > 0
                          ? `${fmt(cal.totalMetrosBobina, 0)} m`
                          : <span className="text-base-content/20">—</span>}
                      </td>
                      <td className="text-right font-mono text-sm">{fmtUsd(cal.subtotalUSD)}</td>
                      <td className="text-right font-mono text-sm">{fmtEur(cal.subtotalEUR)}</td>
                      <td>
                        {bobinas.length > 1 && (
                          <button onClick={() => removeBobina(b.id)} className="btn btn-ghost btn-xs text-error">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={7} className="text-sm">Total</td>
                  <td className="text-right font-mono text-sm">{totalMetros > 0 ? `${fmt(totalMetros, 0)} m` : '—'}</td>
                  <td className="text-right font-mono text-sm">{fmtUsd(totalBobinasUSD)}</td>
                  <td className="text-right font-mono text-sm">{fmtEur(totalBobinasEUR)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

          {/* Gastos de importación */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4">
              <h2 className="font-bold text-base mb-1">Gastos de importación (€)</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">

                {/* Suplidos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Suplidos</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={suplidos}
                      onChange={e => setSuplidos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Agente aduanero, handling, B/L, almacenaje en puerto</p>
                </div>

                {/* Exentos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Exentos</span>
                    <span className="badge badge-success badge-sm">✓ Repercute</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={exentos}
                      onChange={e => setExentos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Aranceles de aduana — coste real para el negocio</p>
                </div>

                {/* Sujetos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sujetos (21% IVA)</span>
                    <span className="badge badge-neutral badge-sm">Solo almacenado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0" placeholder="0.00"
                      value={sujetos}
                      onChange={e => setSujetos(e.target.value)}
                      className="input input-bordered w-full font-mono"
                    />
                    <span className="text-sm opacity-50">€</span>
                  </div>
                  <p className="text-xs text-base-content/50">Transporte nacional, descarga en taller</p>
                  {suj > 0 && (
                    <p className="text-xs font-mono text-base-content/40">
                      IVA: {fmtEur(ivaGastos)} → Total factura: {fmtEur(suj + ivaGastos)}
                    </p>
                  )}
                </div>
              </div>

              {/* Aviso sujetos */}
              <div className="alert py-2 mt-3 text-xs bg-base-300 border-base-content/10">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Sujetos (21%)</strong> se guarda para control interno pero <strong>nunca entra en el cálculo del €/metro</strong>.
                  El IVA de los sujetos es deducible y no es un coste neto.
                  El coste de producto se calcula exclusivamente con <strong>Suplidos + Exentos</strong>.
                </span>
              </div>

              {/* Subtotales */}
              <div className="mt-4 pt-3 border-t border-base-content/10 space-y-1.5">
                <div className="flex justify-between text-sm font-medium text-success">
                  <span>Gastos repercutidos en producto (suplidos + exentos)</span>
                  <span className="font-mono">{fmtEur(gastosRepercutibles)}</span>
                </div>
                {suj > 0 && (
                  <div className="flex justify-between text-sm text-base-content/40">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" /> Sujetos (solo almacenado, no repercutido)
                    </span>
                    <span className="font-mono">{fmtEur(suj)}</span>
                  </div>
                )}
                {ivaGastos > 0 && (
                  <div className="flex justify-between text-sm text-base-content/30 text-xs">
                    <span>IVA sujetos (21%) — deducible</span>
                    <span className="font-mono">{fmtEur(ivaGastos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-base-content/10 pt-1">
                  <span>Total desembolso real (todo incluido)</span>
                  <span className="font-mono">{fmtEur(totalDesembolso)}</span>
                </div>
              </div>
            </div>
          </div>

      <div className="alert text-xs p-3 mt-4">
        <div className="space-y-1.5">
          <p className="font-bold">Metodología</p>
          <p>Prorrateo por <strong>valor económico</strong>: cada artículo (bobina, taco, grapa, máquina…) asume el porcentaje de gastos proporcional a su precio total en €.</p>
          <p className="pt-1 border-t border-base-content/10">
            <strong>Se repercute:</strong> Suplidos + Exentos (aranceles)<br />
            <strong>No se repercute:</strong> Sujetos (IVA deducible)
          </p>
        </div>
      </div>

      {/* ── Tabla resultados ── */}
      {hayResultados && (
        <div className="card bg-base-200 shadow-sm mt-6">
          <div className="card-body p-4">
            <h2 className="font-bold text-base mb-3">Coste real por artículo</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Tipo</th>
                    <th>Detalle</th>
                    <th className="text-right">Metros/Uds.</th>
                    <th className="text-right">Valor $ → €</th>
                    <th className="text-right">% valor</th>
                    <th className="text-right">Gastos repercutidos</th>
                    <th className="text-right">Coste total €</th>
                    <th className="text-right text-success">€/metro o ud.</th>
                  </tr>
                </thead>
                <tbody>
                  {bobinasFinal.filter(b => b.subtotalEUR > 0).map((b, idx) => {
                    const tipo = b.tipo || 'BOBINA';
                    const tieneMetos = tipo === 'BOBINA' || tipo === 'TACO';
                    const numRollosLabel = tipo === 'GRAPA' ? 'caj.' : tipo === 'MAQUINA' || tipo === 'OTRO' ? 'ud.' : 'rol.';
                    return (
                      <tr key={b.id} className="hover">
                        <td className="font-medium">{b.referencia || `A${idx + 1}`}</td>
                        <td>
                          <span className="badge badge-ghost badge-xs">{tipo}</span>
                        </td>
                        <td className="text-sm opacity-70">
                          {tipo === 'BOBINA' && (b.espesor || b.ancho)
                            ? [b.espesor && `${b.espesor}mm esp.`, b.ancho && `${b.ancho}mm ancho`].filter(Boolean).join(' · ')
                            : tipo === 'GRAPA' && b.ancho
                            ? `${b.ancho}mm ancho`
                            : '—'}
                        </td>
                        <td className="text-right font-mono text-sm">
                          {tieneMetos
                            ? (b.numRollos > 1 && tipo === 'BOBINA'
                                ? <span>{b.numRollos}×{fmt(b.longitud, 0)} m<br/><span className="opacity-50">= {fmt(b.totalMetrosBobina, 0)} m</span></span>
                                : `${fmt(b.totalMetrosBobina, 0)} m`)
                            : `${b.numRollos} ${numRollosLabel}`}
                        </td>
                        <td className="text-right font-mono text-sm">
                          {fmtUsd(b.subtotalUSD)}<br />
                          <span className="opacity-60">{fmtEur(b.subtotalEUR)}</span>
                        </td>
                        <td className="text-right font-mono text-sm">
                          {totalBobinasEUR > 0 ? fmt(b.subtotalEUR / totalBobinasEUR * 100, 1) : '0.0'}%
                        </td>
                        <td className="text-right font-mono">{fmtEur(b.gastosProrrateados)}</td>
                        <td className="text-right font-mono font-bold">{fmtEur(b.costeFinalEUR)}</td>
                        <td className="text-right font-mono font-bold text-success text-base">
                          {b.costePorMetro > 0
                            ? `${fmtEur(b.costePorMetro)}/m`
                            : b.costeFinalEUR > 0 && b.numRollos > 0
                            ? `${fmtEur(b.costeFinalEUR / b.numRollos)}/ud`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {bobinasFinal.filter(b => b.subtotalEUR > 0).length > 1 && (
                  <tfoot>
                    <tr className="font-bold border-t-2 border-base-content/20">
                      <td colSpan={4}>Total</td>
                      <td className="text-right font-mono">
                        {fmtUsd(totalBobinasUSD)}<br />
                        <span className="font-normal opacity-60">{fmtEur(totalBobinasEUR)}</span>
                      </td>
                      <td className="text-right font-mono">100 %</td>
                      <td className="text-right font-mono">{fmtEur(gastosRepercutibles)}</td>
                      <td className="text-right font-mono">{fmtEur(costeProducto)}</td>
                      <td className="text-right font-mono text-success">
                        {totalMetros > 0 ? `${fmtEur(costeProducto / totalMetros)}/m` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      <div className="no-print">
        <HistorialImportaciones onCargar={handleCargarImportacion} />
      </div>

      {/* ── Modal guardar ── */}
      {modalGuardar && (
        <ModalGuardar datos={datosParaGuardar} onClose={() => setModalGuardar(false)} />
      )}
    </div>
  );
}
