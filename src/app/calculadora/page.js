"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2, Download, Save, Info } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utils';
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable"; 

const fetcher = (url) => fetch(url).then((res) => res.json());

const TotalDisplay = ({ label, value, unit }) => (
  <div className="stat bg-base-200 border border-base-300 rounded-lg p-4">
    <div className="stat-title text-xs uppercase font-bold opacity-60">{label}</div>
    <div className="stat-value text-2xl">{value}</div>
    <div className="stat-desc">{unit}</div>
  </div>
);

export default function CalculadoraPage() {
  // --- Estado para el item actual ---
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [selectedMarginId, setSelectedMarginId] = useState(''); 
  const [unidades, setUnidades] = useState(1);
  const [ancho, setAncho] = useState(0); // en mm
  const [largo, setLargo] = useState(0); // en mm
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);

  // 1. Cargar datos necesarios
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: materiales, error: materialesError, isLoading: materialesLoading } = useSWR('/api/materiales', fetcher);
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);
  
  const isLoading = tarifasLoading || materialesLoading || margenesLoading;

  // 2. Derivar listas únicas para los selectores
  const availableEspesores = useMemo(() => {
    if (!tarifas || !selectedMaterial) return [];
    
    const espesores = tarifas
      .filter(t => t.material === selectedMaterial)
      .map(t => String(t.espesor));
    
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, selectedMaterial]);

  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);
  
  useEffect(() => {
    setSelectedEspesor('');
  }, [selectedMaterial]);

  // --- 3. CÁLCULO BASADO EN M2 ---
  const currentCalculation = useMemo(() => {
    if (!tarifas || !selectedMaterial || !selectedEspesor || unidades <= 0 || ancho <= 0 || largo <= 0) {
        return { precioUnitario: 0, pesoUnitario: 0, precioTotal: 0, pesoTotal: 0, isValid: false };
    }
    
    // Buscar tarifa (Precio y Peso ahora se interpretan como POR M2)
    const tarifa = tarifas.find(t => 
        t.material === selectedMaterial && 
        t.espesor == selectedEspesor
    );

    if (!tarifa) return { isValid: false, errorMessage: 'Tarifa no encontrada' };

    // Variables Base
    const multiplicador = selectedMargin?.multiplicador || 1;
    const gastoFijoTotal = selectedMargin?.gastoFijo || 0; 
    const unidadesInt = parseInt(unidades) || 1; 

    // Conversión a Metros
    const anchoMetros = ancho / 1000;
    const largoMetros = largo / 1000;
    const areaPorPieza = anchoMetros * largoMetros; // m2

    // Cálculo Precio (Base m2 * Margen * Area)
    const precioBaseM2 = tarifa.precio;
    const precioM2ConMargen = precioBaseM2 * multiplicador; 
    
    let precioUnitario = precioM2ConMargen * areaPorPieza; 
    
    // Prorrateo de Gasto Fijo
    if (gastoFijoTotal > 0) {
       precioUnitario += (gastoFijoTotal / unidadesInt); 
    }

    // Cálculo Peso (Base kg/m2 * Area)
    const pesoBaseM2 = tarifa.peso; 
    const pesoUnitario = pesoBaseM2 * areaPorPieza;

    return { 
        precioBaseM2, // Para mostrar en UI
        pesoBaseM2,   // Para mostrar en UI
        precioUnitario, 
        pesoUnitario, 
        precioTotal: precioUnitario * unidadesInt, 
        pesoTotal: pesoUnitario * unidadesInt,
        areaTotal: areaPorPieza * unidadesInt,
        isValid: true
    };
  }, [tarifas, selectedMaterial, selectedEspesor, selectedMargin, unidades, ancho, largo]);

  const totalesGenerales = useMemo(() => {
    return itemsAgregados.reduce((acc, item) => ({
        totalPrecio: acc.totalPrecio + item.precioTotal,
        totalPeso: acc.totalPeso + item.pesoTotal,
        totalArea: acc.totalArea + (item.areaTotal || 0)
    }), { totalPrecio: 0, totalPeso: 0, totalArea: 0 });
  }, [itemsAgregados]);

  const handleAddItem = () => {
    if (!currentCalculation.isValid) return;

    setIsAddingItem(true);
    try {
      const multiplicador = selectedMargin?.multiplicador || 1;
      const marginText = selectedMargin ? ` (Margen: x${multiplicador.toFixed(2)})` : '';

      const newItem = {
        id: Date.now(),
        // Descripción detallada automática
        descripcion: `${selectedMaterial} (${selectedEspesor}mm)`,
        detalles: `${ancho}x${largo} mm ${marginText}`,
        medidas: `${ancho}x${largo}`,
        unidades: unidades,
        precioUnitario: currentCalculation.precioUnitario, 
        pesoUnitario: currentCalculation.pesoUnitario,
        precioTotal: currentCalculation.precioTotal,
        pesoTotal: currentCalculation.pesoTotal,
        areaTotal: currentCalculation.areaTotal
      };

      setItemsAgregados(prev => [...prev, newItem]);
      setUnidades(1);
      // Opcional: Limpiar dimensiones para obligar a repensar la siguiente pieza
      // setAncho(0); 
      // setLargo(0);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };
  
  const handleSavePresupuesto = async () => {
    if (itemsAgregados.length === 0) return alert("Añade ítems primero.");
    setIsSaving(true);
    try {
      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: itemsAgregados, 
          totales: totalesGenerales,
          nombre: `Cálculo Web ${new Date().toLocaleString('es-ES')}`
        }),
      });

      if (!res.ok) throw new Error('Error al guardar.');
      alert(`✅ Presupuesto guardado correctamente.`);
      setItemsAgregados([]); 
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
     if (itemsAgregados.length === 0) return;
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Hoja de Cálculo Taller", 14, 22);
      doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
      
      const tableRows = itemsAgregados.map(item => [
        item.descripcion,
        item.detalles,
        item.unidades,
        formatCurrency(item.precioTotal),
        formatWeight(item.pesoTotal)
      ]);

      autoTable(doc, { 
        head: [["Material", "Detalles", "Uds", "Precio Total", "Peso Total"]],
        body: tableRows,
        startY: 40, theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(`TOTAL PRECIO: ${formatCurrency(totalesGenerales.totalPrecio)}`, 195, finalY, { align: 'right' });
      doc.text(`TOTAL PESO: ${formatWeight(totalesGenerales.totalPeso)}`, 195, finalY + 7, { align: 'right' });
      
      doc.save(`calculo-taller-${Date.now()}.pdf`);
  };

  if (isLoading) return <div className="flex justify-center h-screen items-center"><span className="loading loading-dots loading-lg"></span></div>;
  if (tarifasError || materialesError) return <div className="alert alert-error m-4">Error cargando tarifas.</div>;

  const uniqueMaterials = materiales?.map(m => m.nombre).sort() || [];

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calculator className="text-primary" /> Calculadora de Piezas (m²)
        </h1>
        <div className="flex gap-2">
             <button onClick={handleExportPDF} className="btn btn-outline btn-sm" disabled={itemsAgregados.length === 0}>
                <Download className="w-4 h-4" /> PDF
             </button>
             <button onClick={handleSavePresupuesto} className="btn btn-primary btn-sm" disabled={itemsAgregados.length === 0 || isSaving}>
                <Save className="w-4 h-4" /> Guardar Presupuesto
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
        <div className="xl:col-span-1 space-y-6">
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body p-6">
              <h2 className="card-title text-lg mb-4">Configuración de Pieza</h2>
              
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                    <label className="label pt-0"><span className="label-text font-semibold">Material Base</span></label>
                    <select className="select select-bordered w-full" value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label pt-0"><span className="label-text font-semibold">Espesor</span></label>
                        <select className="select select-bordered w-full" value={selectedEspesor} onChange={(e) => setSelectedEspesor(e.target.value)} disabled={!selectedMaterial}>
                            <option value="">...</option>
                            {availableEspesores.map(e => <option key={e} value={e}>{e} mm</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label pt-0"><span className="label-text font-semibold">Margen</span></label>
                        <select className="select select-bordered w-full" value={selectedMarginId} onChange={(e) => setSelectedMarginId(e.target.value)}>
                            <option value="">x1.00 (Base)</option>
                            {margenes?.map(m => <option key={m.id} value={m.id}>{m.descripcion} (x{m.multiplicador})</option>)}
                        </select>
                    </div>
                </div>

                <div className="divider my-2">Dimensiones</div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label pt-0"><span className="label-text">Ancho (mm)</span></label>
                        <input type="number" className="input input-bordered w-full" value={ancho} onChange={(e) => setAncho(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label pt-0"><span className="label-text">Largo (mm)</span></label>
                        <input type="number" className="input input-bordered w-full" value={largo} onChange={(e) => setLargo(parseFloat(e.target.value) || 0)} />
                    </div>
                </div>
                
                <div>
                    <label className="label pt-0"><span className="label-text font-bold">Cantidad</span></label>
                    <input type="number" className="input input-bordered w-full font-bold text-lg" value={unidades} onChange={(e) => setUnidades(parseInt(e.target.value) || 1)} min="1" />
                </div>
              </div>

              {/* Previsualización */}
              {currentCalculation.isValid && (
                  <div className="mt-6 bg-base-200/50 rounded-lg p-4 border border-base-300">
                      <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-info mt-1" />
                          <div className="w-full text-sm space-y-1">
                              <p className="font-semibold text-base-content/70 flex justify-between">
                                  <span>Tarifa Base:</span> 
                                  <span>{formatCurrency(currentCalculation.precioBaseM2)} / m²</span>
                              </p>
                              <p className="font-semibold text-base-content/70 flex justify-between">
                                  <span>Peso:</span> 
                                  <span>{currentCalculation.pesoBaseM2.toFixed(2)} kg / m²</span>
                              </p>
                              <div className="divider my-1"></div>
                              <div className="flex justify-between items-center text-lg font-bold text-primary">
                                  <span>Total Item:</span>
                                  <span>{formatCurrency(currentCalculation.precioTotal)}</span>
                              </div>
                              <div className="text-right text-xs text-base-content/50">
                                  ({formatWeight(currentCalculation.pesoTotal)} total)
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="card-actions justify-end mt-4">
                <button onClick={handleAddItem} className="btn btn-primary w-full" disabled={!currentCalculation.isValid || isAddingItem}>
                  <Plus className="w-5 h-5" /> Añadir a la Lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: LISTA Y TOTALES */}
        <div className="xl:col-span-2 flex flex-col gap-6">
            {/* Totales Superiores: Superficie Eliminada */}
            <div className="grid grid-cols-2 gap-4">
                <TotalDisplay label="Importe Total" value={formatCurrency(totalesGenerales.totalPrecio)} unit="EUR" />
                <TotalDisplay label="Peso Total" value={formatWeight(totalesGenerales.totalPeso)} unit="Kg" />
            </div>

            {/* Tabla */}
            <div className="card bg-base-100 shadow-xl flex-grow">
                <div className="card-body p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full table-zebra">
                            <thead className="bg-base-200">
                                <tr>
                                    <th>Descripción</th>
                                    <th>Medidas</th>
                                    <th className="text-center">Cant.</th>
                                    <th className="text-right">P. Unit.</th>
                                    <th className="text-right">Total</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsAgregados.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">Lista vacía. Añade piezas desde el panel izquierdo.</td></tr>
                                ) : (
                                    itemsAgregados.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="font-bold">{item.descripcion}</div>
                                                <div className="text-xs opacity-50">Peso unit: {formatWeight(item.pesoUnitario)}</div>
                                            </td>
                                            <td className="font-mono text-xs">{item.detalles}</td>
                                            <td className="text-center font-bold">{item.unidades}</td>
                                            <td className="text-right">{formatCurrency(item.precioUnitario)}</td>
                                            <td className="text-right font-bold text-primary">{formatCurrency(item.precioTotal)}</td>
                                            <td>
                                                <button onClick={() => handleRemoveItem(item.id)} className="btn btn-ghost btn-xs text-error">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}