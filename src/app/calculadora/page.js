"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2, Download, Info } from 'lucide-react';
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
  const [unidades, setUnidades] = useState(''); 
  const [ancho, setAncho] = useState(0); // en mm
  const [largo, setLargo] = useState(0); // en mm
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false); 

  // 1. Cargar datos
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: materiales, error: materialesError, isLoading: materialesLoading } = useSWR('/api/materiales', fetcher);
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);
  
  const isLoading = tarifasLoading || materialesLoading || margenesLoading;

  // 2. Derivar listas
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
    const unidadesInt = parseInt(unidades) || 0;

    if (!tarifas || !selectedMaterial || !selectedEspesor || unidadesInt <= 0 || ancho <= 0 || largo <= 0) {
        return { precioUnitario: 0, pesoUnitario: 0, precioTotal: 0, pesoTotal: 0, isValid: false };
    }
    
    const tarifa = tarifas.find(t => 
        t.material === selectedMaterial && 
        t.espesor == selectedEspesor
    );

    if (!tarifa) return { isValid: false, errorMessage: 'Tarifa no encontrada' };

    const multiplicador = selectedMargin?.multiplicador || 1;
    const gastoFijoTotal = selectedMargin?.gastoFijo || 0; 

    const anchoMetros = ancho / 1000;
    const largoMetros = largo / 1000;
    const areaPorPieza = anchoMetros * largoMetros; 

    const precioBaseM2 = tarifa.precio;
    const precioM2ConMargen = precioBaseM2 * multiplicador; 
    
    let precioUnitario = precioM2ConMargen * areaPorPieza; 
    
    if (gastoFijoTotal > 0) {
       precioUnitario += (gastoFijoTotal / unidadesInt); 
    }

    const pesoBaseM2 = tarifa.peso; 
    const pesoUnitario = pesoBaseM2 * areaPorPieza;

    return { 
        precioBaseM2, 
        pesoBaseM2,   
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
      const unidadesInt = parseInt(unidades);
      const newItem = {
        id: Date.now(),
        descripcion: `${selectedMaterial} (${selectedEspesor}mm)`,
        detalles: `${ancho}x${largo} mm`, // Simplificado para el PDF
        medidas: `${ancho}x${largo}`,
        unidades: unidadesInt,
        precioUnitario: currentCalculation.precioUnitario, 
        pesoUnitario: currentCalculation.pesoUnitario,
        precioTotal: currentCalculation.precioTotal,
        pesoTotal: currentCalculation.pesoTotal,
        areaTotal: currentCalculation.areaTotal
      };

      setItemsAgregados(prev => [...prev, newItem]);
      setUnidades(''); 
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };
  
  // --- GENERACIÓN DE PDF NEUTRO ---
  const handleExportPDF = () => {
     if (itemsAgregados.length === 0) return;
      const doc = new jsPDF();
      
      // CABECERA NEUTRA
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PRESUPUESTO", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 105, 28, { align: 'center' });
      
      // TABLA LIMPIA
      const tableRows = itemsAgregados.map(item => [
        item.descripcion,
        item.medidas,
        item.unidades,
        formatCurrency(item.precioUnitario),
        formatCurrency(item.precioTotal)
      ]);

      autoTable(doc, { 
        head: [["Descripción / Material", "Medidas (mm)", "Cant.", "P. Unit.", "Total"]],
        body: tableRows,
        startY: 35, 
        theme: 'plain', // Tema minimalista, parece un documento de texto
        headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        styles: { 
            fontSize: 10, 
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Descripción
            2: { halign: 'center' },  // Cant
            3: { halign: 'right' },   // P. Unit
            4: { halign: 'right', fontStyle: 'bold' } // Total
        }
      });

      // TOTALES AL PIE
      const finalY = doc.lastAutoTable.finalY + 10;
      
      // Línea separadora simple
      doc.setLineWidth(0.5);
      doc.line(120, finalY - 5, 195, finalY - 5);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: ${formatCurrency(totalesGenerales.totalPrecio)}`, 190, finalY, { align: 'right' });
      
      // Peso Total (Información logística útil, en pequeño)
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      
      // Nota de validez genérica
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Validez de la oferta: 15 días. Impuestos no incluidos.", 14, 285);

      doc.save(`presupuesto-${Date.now()}.pdf`);
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
        {/* SOLO BOTÓN PDF */}
        <button onClick={handleExportPDF} className="btn btn-primary" disabled={itemsAgregados.length === 0}>
           <Download className="w-5 h-5" /> Imprimir Presupuesto (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO: CONFIGURACIÓN */}
        <div className="xl:col-span-1 space-y-6">
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body p-6">
              <h2 className="card-title text-lg mb-4">Configuración de Pieza</h2>
              
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
                    <input 
                        type="number" 
                        className="input input-bordered w-full font-bold text-lg" 
                        value={unidades} 
                        placeholder="Cantidad..."
                        onChange={(e) => {
                            const val = e.target.value;
                            setUnidades(val === '' ? '' : parseInt(val));
                        }} 
                        min="1" 
                    />
                </div>
              </div>

              {currentCalculation.isValid && (
                  <div className="mt-6 bg-base-200/50 rounded-lg p-4 border border-base-300">
                      <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-info mt-1" />
                          <div className="w-full text-sm space-y-1">
                              <p className="font-semibold text-base-content/70 flex justify-between">
                                  <span>Tarifa Base:</span> 
                                  <span>{formatCurrency(currentCalculation.precioBaseM2)} / m²</span>
                              </p>
                              <div className="divider my-1"></div>
                              <div className="flex justify-between items-center text-lg font-bold text-primary">
                                  <span>Total Item:</span>
                                  <span>{formatCurrency(currentCalculation.precioTotal)}</span>
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
            <div className="grid grid-cols-2 gap-4">
                <TotalDisplay label="Importe Total" value={formatCurrency(totalesGenerales.totalPrecio)} unit="EUR" />
                <TotalDisplay label="Peso Total" value={formatWeight(totalesGenerales.totalPeso)} unit="Kg" />
            </div>

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
                                                <div className="text-xs opacity-50">{item.detalles}</div>
                                            </td>
                                            <td className="font-mono text-xs">{item.medidas}</td>
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