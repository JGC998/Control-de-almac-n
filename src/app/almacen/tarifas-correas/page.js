"use client";
import React, { useState, useMemo, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Link2, Unlink, Zap } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { toastError, toast } from '@/lib/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_REFS = '/api/configuracion/referencias';

function fmt2(n) {
  return (n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Celda con select de espesor GOMA — auto-guarda al cambiar
function VinculoCell({ row, tarifasGoma, guardandoRef }) {
  const [guardando, setGuardando] = useState(false);

  const handleChange = async (valor) => {
    if (guardandoRef.current) {
      toastError('Espera a que termine de guardarse el cambio anterior');
      return;
    }
    guardandoRef.current = true;
    setGuardando(true);
    const espesor = valor === '' ? null : parseFloat(valor);
    try {
      const res = await fetch(`${API_REFS}/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ espesoreGoma: espesor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      await mutate(API_REFS);
    } catch (err) {
      toastError(err.message || 'Error al guardar vínculo');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {row.espesoreGoma != null
        ? <Link2 className="w-3.5 h-3.5 text-success shrink-0" />
        : <Unlink className="w-3.5 h-3.5 text-base-content/25 shrink-0" />
      }
      <select
        className={`select select-xs border-0 bg-transparent focus:bg-base-200 w-full max-w-[220px] ${guardando ? 'opacity-50' : ''}`}
        value={row.espesoreGoma != null ? String(row.espesoreGoma) : ''}
        onChange={e => handleChange(e.target.value)}
        disabled={guardando}
      >
        <option value="">Sin vincular</option>
        {tarifasGoma.map(t => (
          <option key={t.id} value={String(t.espesor)}>
            {t.espesor} mm{t.lonas ? ` · ${t.lonas}L` : ''} — {fmt2(t.precio)} €/m²
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TarifasCorreasPage() {
  const { data: refs, isLoading: refsLoading } = useSWR(API_REFS, fetcher);
  const { data: todasTarifas, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const guardandoRef = useRef(false);
  const [filtro, setFiltro] = useState('');
  const [soloVinculadas, setSoloVinculadas] = useState(false);
  const [autoVinculando, setAutoVinculando] = useState(false);

  const tarifasGoma = useMemo(() => {
    if (!Array.isArray(todasTarifas)) return [];
    return todasTarifas
      .filter(t => t.material === 'GOMA' && t.espesor != null)
      // Una entrada por espesor (la primera si hay variantes por acabado/color)
      .reduce((acc, t) => {
        if (!acc.find(x => x.espesor === t.espesor)) acc.push(t);
        return acc;
      }, [])
      .sort((a, b) => a.espesor - b.espesor);
  }, [todasTarifas]);

  // Mapa rápido espesor → tarifa GOMA
  const gomaMap = useMemo(() => {
    const m = {};
    tarifasGoma.forEach(t => { m[t.espesor] = t; });
    return m;
  }, [tarifasGoma]);

  const lista = useMemo(() => {
    if (!Array.isArray(refs)) return [];
    return [...refs]
      .filter(r => {
        const nombre = r.nombre || r.referencia || '';
        const passNombre = filtro === '' || nombre.toLowerCase().includes(filtro.toLowerCase());
        const passVinculo = !soloVinculadas || r.espesoreGoma != null;
        return passNombre && passVinculo;
      })
      .sort((a, b) => {
        const na = (a.nombre || a.referencia || '').localeCompare(b.nombre || b.referencia || '', 'es');
        if (na !== 0) return na;
        return (a.ancho ?? 0) - (b.ancho ?? 0);
      });
  }, [refs, filtro, soloVinculadas]);

  const vinculadas = useMemo(() => (refs ?? []).filter(r => r.espesoreGoma != null), [refs]);

  const handleAutoVincular = async () => {
    if (!Array.isArray(refs) || tarifasGoma.length === 0) return;
    setAutoVinculando(true);
    const sinVincular = refs.filter(r => r.espesoreGoma == null && r.lonas != null);
    let ok = 0, ambiguas = 0;
    for (const ref of sinVincular) {
      const matches = tarifasGoma.filter(t => t.lonas != null && Number(t.lonas) === Number(ref.lonas));
      if (matches.length === 1) {
        try {
          const res = await fetch(`${API_REFS}/${ref.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ espesoreGoma: matches[0].espesor }),
          });
          if (res.ok) ok++;
        } catch { /* continúa */ }
      } else if (matches.length > 1) {
        ambiguas++;
      }
    }
    await mutate(API_REFS);
    setAutoVinculando(false);
    const msg = ok > 0
      ? `${ok} referencia${ok !== 1 ? 's' : ''} vinculada${ok !== 1 ? 's' : ''} automáticamente${ambiguas > 0 ? ` · ${ambiguas} ambigua${ambiguas !== 1 ? 's' : ''} (varias GOMA con mismo nº lonas)` : ''}`
      : ambiguas > 0
        ? `Sin cambios — ${ambiguas} referencia${ambiguas !== 1 ? 's' : ''} con lonas ambiguas, selecciona manualmente`
        : 'Todas las referencias ya estaban vinculadas o no tienen lonas definidas';
    ok > 0 ? toast(msg, 'success') : toastError(msg);
  };

  const handleExportPDF = () => {
    const exportables = lista.filter(r => r.espesoreGoma != null && gomaMap[r.espesoreGoma]);
    if (exportables.length === 0) { toastError('Vincula al menos una referencia a una tarifa GOMA primero.'); return; }

    const doc = new jsPDF({ orientation: 'portrait' });
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Tarifa de Correas Transportadoras', 14, 18);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(`Actualizada el ${fecha}  ·  Precios en euros  ·  IVA no incluido`, 14, 25);
    doc.setTextColor(0);

    // Agrupar por espesor GOMA
    const grupos = {};
    exportables.forEach(r => {
      const key = r.espesoreGoma;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(r);
    });

    let startY = 32;
    Object.entries(grupos)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .forEach(([espesor, filas]) => {
        const tarifa = gomaMap[parseFloat(espesor)];
        const lLabel = tarifa.lonas ? ` · ${tarifa.lonas}L` : '';
        doc.setFontSize(10); doc.setFont('helvetica', 'bold');
        doc.text(`GOMA ${espesor} mm${lLabel}  —  ${fmt2(tarifa.precio)} €/m²`, 14, startY + 4);
        startY += 2;

        const rows = filas.map(r => {
          const anchoM = (r.ancho ?? 0) / 1000;
          const precioML = tarifa.precio * anchoM;
          return [
            r.nombre || r.referencia || '—',
            r.ancho != null ? `${r.ancho} mm` : '—',
            r.lonas != null ? String(r.lonas) : '—',
            r.pesoPorMetroLineal != null ? `${fmt2(r.pesoPorMetroLineal)} kg/m` : '—',
            `${fmt2(tarifa.precio)} €/m²`,
            `${fmt2(precioML)} €/m`,
          ];
        });

        autoTable(doc, {
          head: [['Referencia', 'Ancho', 'Lonas', 'Peso', '€/m²', '€/m lineal']],
          body: rows,
          startY: startY + 4,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { fontStyle: 'bold' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold', textColor: [40, 100, 200] },
          },
          alternateRowStyles: { fillColor: [247, 248, 250] },
          margin: { left: 14, right: 14 },
        });

        startY = doc.lastAutoTable.finalY + 8;
      });

    doc.save(`tarifa-correas-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (refsLoading || tarifasLoading) {
    return <div className="flex items-center justify-center h-64"><span className="loading loading-spinner loading-lg" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/almacen" className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Tarifa metrajes</h1>
          <p className="text-sm text-base-content/50">
            Vincula cada referencia a un espesor de GOMA para obtener el precio/m² y precio/m lineal automáticamente.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href="/configuracion/referencias">
            <button className="btn btn-ghost btn-sm gap-1">
              <Settings className="w-4 h-4" /> Referencias
            </button>
          </Link>
          <button
            onClick={handleAutoVincular}
            disabled={autoVinculando || !Array.isArray(refs) || refs.filter(r => r.espesoreGoma == null && r.lonas != null).length === 0}
            className="btn btn-secondary btn-sm gap-1"
            title="Vincula automáticamente cada referencia a la tarifa GOMA con el mismo número de lonas (solo cuando hay una única coincidencia)"
          >
            {autoVinculando
              ? <span className="loading loading-spinner loading-xs" />
              : <Zap className="w-4 h-4" />}
            Auto-vincular
          </button>
          <button
            onClick={handleExportPDF}
            disabled={vinculadas.length === 0}
            className="btn btn-primary btn-sm gap-1"
            title={vinculadas.length === 0 ? 'Vincula referencias primero' : `Exportar ${vinculadas.length} referencia(s) vinculada(s)`}
          >
            <Download className="w-4 h-4" /> Imprimir tarifa
          </button>
        </div>
      </div>

      {/* Aviso si no hay tarifas GOMA */}
      {tarifasGoma.length === 0 && (
        <div role="alert" className="alert alert-warning text-sm">
          No hay tarifas de material GOMA configuradas. Ve a <Link href="/tarifas" className="link">Gestión de Tarifas</Link> y añade entradas para GOMA.
        </div>
      )}

      {/* Stats */}
      <div className="stats shadow w-full">
        <div className="stat py-3">
          <div className="stat-title">Referencias totales</div>
          <div className="stat-value text-2xl">{(refs ?? []).length}</div>
        </div>
        <div className="stat py-3">
          <div className="stat-title">Vinculadas a GOMA</div>
          <div className="stat-value text-2xl text-success">{vinculadas.length}</div>
        </div>
        <div className="stat py-3">
          <div className="stat-title">Espesores GOMA disponibles</div>
          <div className="stat-value text-2xl text-info">{tarifasGoma.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="text"
          className="input input-bordered input-sm w-56"
          placeholder="Buscar referencia…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-success"
            checked={soloVinculadas}
            onChange={e => setSoloVinculadas(e.target.checked)}
          />
          Solo vinculadas
        </label>
        <span className="text-xs text-base-content/40 ml-auto">
          {lista.length} referencia{lista.length !== 1 ? 's' : ''}
        </span>
      </div>

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
                <th>Vínculo GOMA</th>
                <th className="text-right">€/m²</th>
                <th className="text-right text-primary">€/m lineal</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-base-content/40">
                    {filtro || soloVinculadas ? 'Sin resultados.' : 'No hay referencias. Crea algunas en Configuración → Referencias.'}
                  </td>
                </tr>
              ) : lista.map(row => {
                const tarifa = row.espesoreGoma != null ? gomaMap[row.espesoreGoma] : null;
                const precioM2 = tarifa?.precio ?? null;
                const anchoM = (row.ancho ?? 0) / 1000;
                const precioML = precioM2 != null && row.ancho ? precioM2 * anchoM : null;

                return (
                  <tr key={row.id} className="hover">
                    <td className="font-semibold">
                      {row.nombre || row.referencia || <span className="text-base-content/30 italic">sin nombre</span>}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {row.ancho != null ? `${row.ancho} mm` : <span className="opacity-40">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {row.lonas != null ? row.lonas : <span className="opacity-40">—</span>}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {row.pesoPorMetroLineal != null ? `${fmt2(row.pesoPorMetroLineal)} kg/m` : <span className="opacity-40">—</span>}
                    </td>
                    <td className="min-w-[200px]">
                      <VinculoCell row={row} tarifasGoma={tarifasGoma} guardandoRef={guardandoRef} />
                    </td>
                    <td className="text-right font-mono text-sm">
                      {precioM2 != null
                        ? <span className="font-semibold">{fmt2(precioM2)} €</span>
                        : <span className="opacity-25">—</span>}
                    </td>
                    <td className="text-right font-mono font-bold text-primary">
                      {precioML != null
                        ? `${fmt2(precioML)} €`
                        : <span className="opacity-25 font-normal text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {vinculadas.length > 0 && (
          <div className="px-4 py-2 border-t border-base-200 text-xs text-base-content/40">
            €/m lineal = precio tarifa GOMA × ancho (m). Los precios se actualizan automáticamente cuando cambias la tarifa en Gestión de Tarifas.
          </div>
        )}
      </div>
    </div>
  );
}
