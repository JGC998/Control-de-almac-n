"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Ruler, Plus, Trash2, Download, ChevronRight } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utilidades';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CalculadoraMetrajesPage() {
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [ancho, setAncho] = useState('');
  const [metros, setMetros] = useState('');
  const [referencia, setReferencia] = useState('');

  const [lineas, setLineas] = useState([]);

  const { data: tarifas, isLoading: tarifasLoading } = useSWR('/api/precios');
  const { data: margenes } = useSWR('/api/pricing/margenes');

  const isPVC = selectedMaterial === 'PVC';

  const materiales = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const espesores = useMemo(() => {
    if (!tarifas || !selectedMaterial) return [];
    return [...new Set(
      tarifas.filter(t => t.material === selectedMaterial).map(t => String(t.espesor))
    )].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, selectedMaterial]);

  const PVC_COLORS = ['AZUL', 'BLANCO', 'NEGRO', 'VERDE'];

  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);

  const calculo = useMemo(() => {
    const anchoMm = parseFloat(ancho) || 0;
    const metrosNum = parseFloat(metros) || 0;

    if (!tarifas || !selectedMaterial || !selectedEspesor || anchoMm <= 0 || metrosNum <= 0) {
      return { isValid: false };
    }
    if (isPVC && !selectedColor) {
      return { isValid: false, errorMessage: 'Selecciona un color' };
    }

    const tarifa = tarifas.find(t =>
      t.material === selectedMaterial &&
      Number(t.espesor) === Number(selectedEspesor)
    );
    if (!tarifa) return { isValid: false, errorMessage: 'Tarifa no encontrada para esa combinación' };

    const anchoM = anchoMm / 1000;
    const area = anchoM * metrosNum;
    const multiplicador = selectedMargin?.multiplicador ?? 1;
    const gastoFijo = selectedMargin?.gastoFijo ?? 0;

    const precioBase = tarifa.precio * area;
    const precioConMargen = precioBase * multiplicador + gastoFijo;
    const peso = tarifa.peso * area;

    return {
      isValid: true,
      tarifa,
      area,
      anchoM,
      precioBase,
      precioConMargen,
      peso,
      precioM2: tarifa.precio,
      pesoM2: tarifa.peso,
    };
  }, [tarifas, selectedMaterial, selectedEspesor, selectedColor, selectedMarginId, ancho, metros, isPVC, selectedMargin]);

  const totales = useMemo(() => lineas.reduce(
    (acc, l) => ({ precio: acc.precio + l.precio, peso: acc.peso + l.peso, metros: acc.metros + l.metros }),
    { precio: 0, peso: 0, metros: 0 }
  ), [lineas]);

  const handleAdd = () => {
    if (!calculo.isValid) return;
    const anchoMm = parseFloat(ancho);
    const metrosNum = parseFloat(metros);
    const nombre = referencia.trim() ||
      `${selectedMaterial} ${selectedEspesor}mm${selectedColor ? ` ${selectedColor}` : ''} — ${anchoMm}mm ancho`;

    setLineas(prev => [...prev, {
      id: Date.now(),
      descripcion: nombre,
      material: selectedMaterial,
      espesor: selectedEspesor,
      color: selectedColor || null,
      anchoMm,
      metros: metrosNum,
      area: calculo.area,
      precio: calculo.precioConMargen,
      peso: calculo.peso,
    }]);
    setMetros('');
    setReferencia('');
  };

  const handleExportPDF = () => {
    if (lineas.length === 0) return;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO METRAJES', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [['Descripción', 'Ancho (mm)', 'Metros', 'Área (m²)', 'Peso (kg)', 'Precio']],
      body: lineas.map(l => [
        l.descripcion,
        l.anchoMm,
        l.metros.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        l.area.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4}),
        formatWeight(l.peso),
        formatCurrency(l.precio),
      ]),
      foot: [['', '', formatWeight(totales.metros) + ' m', '', formatWeight(totales.peso) + ' kg', formatCurrency(totales.precio)]],
      theme: 'grid',
      footStyles: { fontStyle: 'bold' },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(totales.precio)}`, 190, finalY, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('Validez de la oferta: 15 días. Impuestos no incluidos.', 14, 285);

    doc.save(`metrajes-${Date.now()}.pdf`);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="tabs tabs-boxed">
          <Link href="/calculadora" className="tab">Piezas (m²)</Link>
          <Link href="/calculadora/bandas" className="tab">Bandas PVC</Link>
          <Link href="/calculadora/metrajes" className="tab tab-active">Metrajes</Link>
        </div>
        <button
          onClick={handleExportPDF}
          className="btn btn-secondary"
          disabled={lineas.length === 0}
        >
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Ruler className="text-secondary w-8 h-8" />
        <h1 className="text-3xl font-bold">Calculadora de Metrajes</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Configurador ── */}
        <div className="xl:col-span-1">
          <div className="card bg-base-100 shadow-xl h-fit">
            <div className="card-body">
              <h2 className="card-title text-sm uppercase text-gray-400">Configuración de metraje</h2>

              {/* Material */}
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Material</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedMaterial}
                  onChange={e => { setSelectedMaterial(e.target.value); setSelectedEspesor(''); setSelectedColor(''); }}
                >
                  <option value="">Seleccionar material...</option>
                  {materiales.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Espesor */}
              {selectedMaterial && (
                <div className="form-control w-full mt-2">
                  <label className="label"><span className="label-text">Espesor (mm)</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedEspesor}
                    onChange={e => { setSelectedEspesor(e.target.value); setSelectedColor(''); }}
                  >
                    <option value="">Seleccionar espesor...</option>
                    {espesores.map(e => <option key={e} value={e}>{e} mm</option>)}
                  </select>
                </div>
              )}

              {/* Color (solo PVC) */}
              {isPVC && selectedEspesor && (
                <div className="form-control w-full mt-2">
                  <label className="label"><span className="label-text">Color</span></label>
                  <select
                    className="select select-bordered w-full"
                    value={selectedColor}
                    onChange={e => setSelectedColor(e.target.value)}
                  >
                    <option value="">Seleccionar color...</option>
                    {PVC_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="divider my-1" />

              {/* Ancho */}
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Ancho de tira (mm)</span></label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder="Ej: 150"
                  min={1}
                  value={ancho}
                  onChange={e => setAncho(e.target.value)}
                />
              </div>

              {/* Metros */}
              <div className="form-control w-full mt-2">
                <label className="label"><span className="label-text">Metros lineales</span></label>
                <input
                  type="number"
                  className="input input-bordered w-full font-bold text-lg"
                  placeholder="Ej: 50"
                  min={0.1}
                  step={0.1}
                  value={metros}
                  onChange={e => setMetros(e.target.value)}
                />
              </div>

              {/* Margen */}
              {margenes && margenes.length > 0 && (
                <div className="form-control w-full mt-2">
                  <label className="label"><span className="label-text text-sm">Margen (opcional)</span></label>
                  <select
                    className="select select-bordered select-sm w-full"
                    value={selectedMarginId}
                    onChange={e => setSelectedMarginId(e.target.value)}
                  >
                    <option value="">Sin margen (precio base)</option>
                    {margenes.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.descripcion} (×{m.multiplicador})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Resultado */}
              <div className="mt-4 bg-base-200/50 p-4 rounded-lg border border-base-300">
                {calculo.isValid ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-base-content/60">
                      <span>Área</span>
                      <span className="font-mono">{calculo.area.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})} m²</span>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/60">
                      <span>Peso estimado</span>
                      <span className="font-mono">{formatWeight(calculo.peso)} kg</span>
                    </div>
                    {selectedMarginId && (
                      <div className="flex justify-between text-xs text-base-content/60">
                        <span>Precio base (sin margen)</span>
                        <span className="font-mono">{formatCurrency(calculo.precioBase)}</span>
                      </div>
                    )}
                    <div className="divider my-1" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-base-content/60">Precio total</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(calculo.precioConMargen)}</span>
                    </div>
                    <div className="text-right text-xs text-base-content/40">
                      {formatCurrency(calculo.precioConMargen / parseFloat(metros))}/m lineal
                    </div>

                    {/* Desglose colapsable */}
                    <div className="collapse collapse-arrow bg-base-200 mt-2 border border-base-300 rounded-xl">
                      <input type="checkbox" />
                      <div className="collapse-title text-xs font-semibold flex items-center gap-2 py-2 min-h-0">
                        <ChevronRight className="w-3.5 h-3.5 text-base-content/50" />
                        Desglose del cálculo
                      </div>
                      <div className="collapse-content">
                        <table className="w-full text-xs">
                          <tbody>
                            <tr>
                              <td className="text-base-content/60 py-0.5">Tarifa {selectedMaterial} {selectedEspesor}mm{selectedColor ? ` ${selectedColor}` : ''}</td>
                              <td className="text-right font-mono">{formatCurrency(calculo.precioM2)}/m²</td>
                            </tr>
                            <tr>
                              <td className="text-base-content/60 py-0.5">Ancho tira</td>
                              <td className="text-right font-mono">{ancho} mm = {calculo.anchoM.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})} m</td>
                            </tr>
                            <tr>
                              <td className="text-base-content/60 py-0.5">Metros pedidos</td>
                              <td className="text-right font-mono">{metros} m</td>
                            </tr>
                            <tr className="border-t border-base-300">
                              <td className="text-base-content/60 py-0.5 font-mono text-[10px]">
                                Área = {calculo.anchoM.toLocaleString('es-ES', {minimumFractionDigits: 4, maximumFractionDigits: 4})} × {metros}
                              </td>
                              <td className="text-right font-mono">{calculo.area.toLocaleString('es-ES', {minimumFractionDigits: 6, maximumFractionDigits: 6})} m²</td>
                            </tr>
                            <tr>
                              <td className="text-base-content/60 py-0.5 font-mono text-[10px]">
                                {formatCurrency(calculo.precioM2)} × {calculo.area.toLocaleString('es-ES', {minimumFractionDigits: 6, maximumFractionDigits: 6})} m²
                              </td>
                              <td className="text-right font-mono">{formatCurrency(calculo.precioBase)}</td>
                            </tr>
                            {selectedMarginId && calculo.precioBase !== calculo.precioConMargen && (
                              <tr>
                                <td className="text-base-content/60 py-0.5">× {selectedMargin?.multiplicador} (margen)</td>
                                <td className="text-right font-mono">{formatCurrency(calculo.precioConMargen)}</td>
                              </tr>
                            )}
                            <tr className="border-t-2 border-base-content/20 font-bold">
                              <td className="py-1">Total</td>
                              <td className="text-right font-mono text-primary">{formatCurrency(calculo.precioConMargen)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : calculo.errorMessage ? (
                  <p className="text-sm text-center text-warning py-2">{calculo.errorMessage}</p>
                ) : (
                  <p className="text-sm text-center text-base-content/40 py-4">Completa los datos para calcular</p>
                )}
              </div>

              {/* Referencia opcional */}
              {calculo.isValid && (
                <div className="form-control mt-3">
                  <label className="label py-1"><span className="label-text text-xs">Referencia (opcional)</span></label>
                  <input
                    type="text"
                    className="input input-sm input-bordered w-full"
                    placeholder="Ej: Cinta lateral almacén..."
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                  />
                </div>
              )}

              <button
                className="btn btn-primary w-full mt-3"
                onClick={handleAdd}
                disabled={!calculo.isValid}
              >
                <Plus className="w-4 h-4" /> Añadir a la lista
              </button>
            </div>
          </div>
        </div>

        {/* ── Lista de líneas ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="stats shadow w-full border border-base-200">
            <div className="stat">
              <div className="stat-title">Total metros</div>
              <div className="stat-value text-xl">{totales.metros.toLocaleString('es-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})} m</div>
            </div>
            <div className="stat">
              <div className="stat-title">Peso total</div>
              <div className="stat-value text-xl">{formatWeight(totales.peso)} kg</div>
            </div>
            <div className="stat place-items-end">
              <div className="stat-title">Total presupuesto</div>
              <div className="stat-value text-secondary">{formatCurrency(totales.precio)}</div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-base-200">
                  <tr>
                    <th>Descripción</th>
                    <th className="text-right">Ancho</th>
                    <th className="text-right">Metros</th>
                    <th className="text-right">Peso</th>
                    <th className="text-right">Precio</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-base-content/40">
                        No hay líneas añadidas
                      </td>
                    </tr>
                  ) : lineas.map(l => (
                    <tr key={l.id} className="hover">
                      <td className="font-semibold text-sm">{l.descripcion}</td>
                      <td className="text-right font-mono text-sm">{l.anchoMm} mm</td>
                      <td className="text-right font-mono text-sm">{l.metros.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m</td>
                      <td className="text-right text-sm">{formatWeight(l.peso)} kg</td>
                      <td className="text-right font-bold text-secondary">{formatCurrency(l.precio)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => setLineas(prev => prev.filter(x => x.id !== l.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
