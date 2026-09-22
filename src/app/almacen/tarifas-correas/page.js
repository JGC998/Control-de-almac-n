"use client";
import React, { useState, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Check, X } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';
import { toastError } from '@/lib/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = '/api/configuracion/referencias';

function fmt2(n) {
  return (n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PrecioCell({ row, editando, setEditando, guardandoRef, onSaved }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);

  const abrir = () => {
    if (editando) return;
    setVal(row.precioM2 != null ? String(row.precioM2) : '');
    setEditando({ id: row.id, value: '' });
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const guardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    const parsed = parseFloat(val);
    const nuevo = val === '' ? null : (isNaN(parsed) ? null : parsed);
    if (nuevo === (row.precioM2 ?? null)) { guardandoRef.current = false; setEditando(null); return; }
    try {
      const res = await fetch(`${API}/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precioM2: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      await mutate(API);
      onSaved?.();
    } catch (err) {
      toastError(err.message || 'Error al guardar precio');
    } finally {
      guardandoRef.current = false;
      setEditando(null);
    }
  };

  const cancelar = () => { setEditando(null); };

  const activo = editando?.id === row.id;

  if (activo) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          className="input input-xs input-bordered w-24 font-mono"
          value={val}
          min={0}
          step="0.01"
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar(); }}
          autoFocus
        />
        <button onClick={guardar} className="btn btn-xs btn-success btn-circle"><Check className="w-3 h-3" /></button>
        <button onClick={cancelar} className="btn btn-xs btn-ghost btn-circle"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={abrir}
      className={`font-mono text-sm px-2 py-0.5 rounded hover:bg-base-200 transition-colors w-full text-left ${row.precioM2 == null ? 'text-base-content/30 italic' : 'text-primary font-semibold'}`}
    >
      {row.precioM2 != null ? `${fmt2(row.precioM2)} €` : '— sin precio'}
    </button>
  );
}

export default function TarifasCorreasPage() {
  const { data: refs, isLoading } = useSWR(API, fetcher);
  const [editando, setEditando] = useState(null);
  const guardandoRef = useRef(false);
  const [filtro, setFiltro] = useState('');

  const lista = useMemo(() => {
    if (!Array.isArray(refs)) return [];
    return [...refs]
      .filter(r => {
        const nombre = r.nombre || r.referencia || '';
        return filtro === '' || nombre.toLowerCase().includes(filtro.toLowerCase());
      })
      .sort((a, b) => {
        const na = (a.nombre || a.referencia || '').localeCompare(b.nombre || b.referencia || '', 'es');
        if (na !== 0) return na;
        return (a.ancho ?? 0) - (b.ancho ?? 0);
      });
  }, [refs, filtro]);

  const conPrecio = useMemo(() => lista.filter(r => r.precioM2 != null), [lista]);

  const handleExportPDF = () => {
    if (conPrecio.length === 0) { toastError('No hay referencias con precio para exportar.'); return; }
    const doc = new jsPDF({ orientation: 'portrait' });
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Tarifa de Correas Transportadoras', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(`Actualizada el ${fecha}`, 14, 25);
    doc.text('Precios en euros · IVA no incluido', 14, 30);
    doc.setTextColor(0);

    const rows = conPrecio.map(r => {
      const anchoM = (r.ancho ?? 0) / 1000;
      const precioML = r.precioM2 != null ? r.precioM2 * anchoM : null;
      return [
        r.nombre || r.referencia || '—',
        r.ancho != null ? `${r.ancho} mm` : '—',
        r.lonas != null ? String(r.lonas) : '—',
        r.pesoPorMetroLineal != null ? `${fmt2(r.pesoPorMetroLineal)} kg/m` : '—',
        `${fmt2(r.precioM2)} €/m²`,
        precioML != null ? `${fmt2(precioML)} €/m` : '—',
      ];
    });

    autoTable(doc, {
      head: [['Referencia', 'Ancho', 'Lonas', 'Peso', '€/m²', '€/m lineal']],
      body: rows,
      startY: 36,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right', textColor: [40, 100, 180] },
      },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      margin: { left: 14, right: 14 },
    });

    const suffix = new Date().toISOString().slice(0, 10);
    doc.save(`tarifa-correas-${suffix}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/almacen" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Tarifas de correas</h1>
          <p className="text-sm text-base-content/50">
            Establece el precio de venta por m² para cada referencia de bobina. Haz clic en el precio para editarlo.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/configuracion/referencias">
            <button className="btn btn-ghost btn-sm gap-1">
              <Settings className="w-4 h-4" /> Gestionar referencias
            </button>
          </Link>
          <button
            onClick={handleExportPDF}
            disabled={conPrecio.length === 0}
            className="btn btn-primary btn-sm gap-1"
            title={conPrecio.length === 0 ? 'Añade precio a alguna referencia primero' : `Exportar ${conPrecio.length} referencia(s) con precio`}
          >
            <Download className="w-4 h-4" /> Imprimir tarifa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats shadow w-full">
        <div className="stat py-3">
          <div className="stat-title">Referencias totales</div>
          <div className="stat-value text-2xl">{lista.length}</div>
        </div>
        <div className="stat py-3">
          <div className="stat-title">Con precio asignado</div>
          <div className="stat-value text-2xl text-success">{conPrecio.length}</div>
        </div>
        <div className="stat py-3">
          <div className="stat-title">Sin precio</div>
          <div className="stat-value text-2xl text-warning">{lista.length - conPrecio.length}</div>
        </div>
      </div>

      {/* Filtro */}
      <input
        type="text"
        className="input input-bordered input-sm w-full max-w-xs"
        placeholder="Buscar referencia…"
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
      />

      {/* Tabla */}
      <div className="card bg-base-100 shadow">
        <div className="overflow-x-auto">
          <table className="table table-zebra table-sm w-full">
            <thead>
              <tr>
                <th>Referencia</th>
                <th className="text-right">Ancho</th>
                <th className="text-right">Lonas</th>
                <th className="text-right">Peso</th>
                <th>Precio / m²</th>
                <th className="text-right text-primary">Precio / m lineal</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-base-content/40">
                    {filtro ? 'Sin resultados para ese filtro.' : 'No hay referencias de bobina. Crea algunas en Configuración → Referencias.'}
                  </td>
                </tr>
              ) : lista.map(row => {
                const anchoM = (row.ancho ?? 0) / 1000;
                const precioML = row.precioM2 != null && row.ancho ? row.precioM2 * anchoM : null;
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-semibold">{row.nombre || row.referencia || <span className="text-base-content/30 italic">sin nombre</span>}</td>
                    <td className="text-right font-mono text-sm">{row.ancho != null ? `${row.ancho} mm` : <span className="opacity-40">—</span>}</td>
                    <td className="text-right font-mono text-sm">{row.lonas != null ? row.lonas : <span className="opacity-40">—</span>}</td>
                    <td className="text-right font-mono text-sm">{row.pesoPorMetroLineal != null ? `${fmt2(row.pesoPorMetroLineal)} kg/m` : <span className="opacity-40">—</span>}</td>
                    <td>
                      <PrecioCell
                        row={row}
                        editando={editando}
                        setEditando={setEditando}
                        guardandoRef={guardandoRef}
                      />
                    </td>
                    <td className="text-right font-mono font-bold text-primary">
                      {precioML != null
                        ? `${fmt2(precioML)} €`
                        : <span className="opacity-30 text-xs font-normal">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {conPrecio.length > 0 && (
          <div className="px-4 py-2 border-t border-base-200 text-xs text-base-content/40">
            Precio/m lineal = €/m² × ancho(m). Haz clic en cualquier precio para editarlo.
          </div>
        )}
      </div>
    </div>
  );
}
