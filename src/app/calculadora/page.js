"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2, Download, Save } from 'lucide-react'; // Importar 'Save'
import { formatCurrency, formatWeight } from '@/utils/utils';
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable"; 

const fetcher = (url) => fetch(url).then((res) => res.json());

const TotalDisplay = ({ label, value, unit }) => (
  <div className="stat bg-primary text-primary-content rounded-lg">
    <div className="stat-title">{label}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-desc">{unit}</div>
  </div>
);

export default function CalculadoraPage() {
  // --- Estado para el item actual ---
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [selectedMarginId, setSelectedMarginId] = useState(''); 
  const [unidades, setUnidades] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [largo, setLargo] = useState(0);
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); // Nuevo estado para guardar

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

  // 3. Obtener el valor del multiplicador seleccionado
  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);
  
  // 4. Resetear espesor si el material cambia
  useEffect(() => {
    setSelectedEspesor('');
  }, [selectedMaterial]);

  // --- 5. NUEVO: Calcular los valores del item actual (PREVISUALIZACIÓN) ---
  const currentCalculation = useMemo(() => {
    // Si falta data o inputs, retornar 0s
    if (!tarifas || !selectedMaterial || !selectedEspesor || unidades <= 0 || ancho <= 0 || largo <= 0) {
        return { precioUnitario: 0, pesoUnitario: 0, precioTotal: 0, pesoTotal: 0, isValid: false };
    }
    
    // Buscar tarifa
    const tarifa = tarifas.find(t => 
        t.material === selectedMaterial && 
        t.espesor == selectedEspesor
    );

    if (!tarifa) {
        return { precioUnitario: 0, pesoUnitario: 0, precioTotal: 0, pesoTotal: 0, isValid: false, errorMessage: 'Tarifa no encontrada' };
    }

    const multiplicador = selectedMargin?.multiplicador || 1;
    // Aseguramos que gastoFijoTotal sea 0 si no está definido o seleccionado
    const gastoFijoTotal = selectedMargin?.gastoFijo || 0; 
    const unidadesInt = parseInt(unidades) || 1; 

    const precioM2ConMargen = tarifa.precio * multiplicador; 
    const areaPorPieza = (ancho / 1000) * (largo / 1000); 

    let precioUnitario = precioM2ConMargen * areaPorPieza; 
    // Añadir el gasto fijo prorrateado por unidad (si existe)
    if (gastoFijoTotal > 0) {
       precioUnitario += (gastoFijoTotal / unidadesInt); 
    }

    const precioTotal = precioUnitario * unidadesInt;
    
    const pesoUnitario = tarifa.peso * areaPorPieza;
    const pesoTotal = pesoUnitario * unidades;

    return { 
        precioUnitario, 
        pesoUnitario, 
        precioTotal, 
        pesoTotal,
        isValid: true
    };
  }, [tarifas, selectedMaterial, selectedEspesor, selectedMargin, unidades, ancho, largo]);
  // -------------------------------------------------------------------------


  // 6. Calcular los totales generales de la lista
  const totalesGenerales = useMemo(() => {
    const totalPrecio = itemsAgregados.reduce((acc, item) => acc + item.precioTotal, 0);
    const totalPeso = itemsAgregados.reduce((acc, item) => acc + item.pesoTotal, 0);
    return { totalPrecio, totalPeso };
  }, [itemsAgregados]);

  // 7. Handler para añadir un item a la lista (simplificado)
  const handleAddItem = async () => {
    // Usamos el cálculo validado de currentCalculation
    if (!currentCalculation.isValid) {
      alert("Por favor, selecciona Material, Espesor, Unidades, Ancho y Largo válidos.");
      return;
    }

    setIsAddingItem(true);

    try {
      const multiplicador = selectedMargin?.multiplicador || 1;
      const marginText = selectedMargin ? ` (x${multiplicador.toFixed(2)})` : '';

      const newItem = {
        id: Date.now(),
        descripcion: `${selectedMaterial} (${selectedEspesor}mm)`,
        medidas: `${ancho} mm x ${largo} mm`,
        unidades: unidades,
        precioUnitario: currentCalculation.precioUnitario, 
        pesoUnitario: currentCalculation.pesoUnitario,
        precioTotal: currentCalculation.precioTotal,
        pesoTotal: currentCalculation.pesoTotal,
        margen: marginText 
      };

      setItemsAgregados(prev => [...prev, newItem]);
      
      // Reseteamos dimensiones y unidades para el siguiente item
      setUnidades(1);
      setAncho(0);
      setLargo(0);
      // Mantener material/espesor seleccionado puede ser útil para agregar piezas similares
      // setSelectedMaterial('');
      // setSelectedEspesor(''); 

    } catch (error) {
      console.error("Error al añadir item:", error);
      alert(`Error al calcular: ${error.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  // 8. Handler para eliminar un item
  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };
  
  // 9. NUEVO: Handler para guardar el presupuesto
  const handleSavePresupuesto = async () => {
    if (itemsAgregados.length === 0) {
      alert("No hay ítems para guardar en el presupuesto.");
      return;
    }

    setIsSaving(true);
    try {
      // ⚠️ ADVERTENCIA: Esta es una ruta de API de ejemplo. Debes implementarla
      // para que reciba itemsAgregados, totalesGenerales y los guarde en Prisma.
      const res = await fetch('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: itemsAgregados, 
          totales: totalesGenerales,
          // Puedes añadir aquí el ID del Cliente o un nombre de referencia
          nombre: `Presupuesto Rápido ${new Date().toLocaleDateString('es-ES')}`
        }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar el presupuesto en el servidor.');
      }
      
      const savedPresupuesto = await res.json();
      alert(`✅ Presupuesto ${savedPresupuesto.id} guardado con éxito.`);
      
      // Opcional: Redirigir al detalle del presupuesto guardado
      // router.push(`/presupuestos/${savedPresupuesto.id}`); 
      setItemsAgregados([]); // Limpiar lista tras guardar

    } catch (error) {
      console.error("Error al guardar presupuesto:", error);
      alert(`❌ Error al guardar presupuesto: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };


  // 10. Handler para generar PDF
  const handleExportPDF = () => {
     // ... (La lógica de exportación a PDF se mantiene igual) ...
     if (itemsAgregados.length === 0) {
        alert("No hay ítems para exportar.");
        return;
      }
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Simulación de Cálculo", 14, 22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
      
      const tableColumn = ["Descripción", "Medidas (mm)", "Unidades", "Precio Unitario"];
      const tableRows = itemsAgregados.map(item => [
        item.descripcion + item.margen,
        item.medidas,
        item.unidades,
        formatCurrency(item.precioUnitario),
      ]);

      autoTable(doc, { 
        head: [tableColumn],
        body: tableRows,
        startY: 40, 
        theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`--- Resumen General ---`, 145, finalY + 10, { align: 'right' });
      doc.setFont("helvetica", "bold");
      doc.text(`Precio Total:`, 145, finalY + 16, { align: 'right' });
      doc.text(`${formatCurrency(totalesGenerales.totalPrecio)}`, 198, finalY + 16, { align: 'right' });
      doc.text(`Peso Total:`, 145, finalY + 22, { align: 'right' });
      doc.text(`${formatWeight(totalesGenerales.totalPeso)}`, 198, finalY + 22, { align: 'right' });
      
      doc.save(`simulacion-calculo-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || materialesError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos necesarios.</div>;

  const uniqueMaterials = materiales?.map(m => m.nombre).sort() || [];
  
  // Condición para deshabilitar el botón de Añadir
  const isAddDisabled = !currentCalculation.isValid || isAddingItem;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Calculator className="mr-2" /> Simulador de Cálculo
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (Inputs y Lista) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Configuración de Item */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Añadir Item</h2>
              
              {/* Primera fila de inputs (Material, Espesor y Margen) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Material</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                  >
                    <option value="">Selecciona material</option>
                    {uniqueMaterials.map(material => (
                      <option key={material} value={material}>{material}</option>
                    ))}
                  </select>
                </label>
                
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Espesor (mm)</span></div>
                  <select 
                    className="select select-bordered"
                    value={selectedEspesor}
                    onChange={(e) => setSelectedEspesor(e.target.value)}
                    disabled={!selectedMaterial}
                  >
                    <option value="">Selecciona espesor</option>
                    {availableEspesores.map(e => (
                      <option key={e} value={e}>{e} mm</option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Margen Aplicable</span></div>
                  <select 
                      className="select select-bordered"
                      value={selectedMarginId}
                      onChange={(e) => setSelectedMarginId(e.target.value)}
                  >
                      <option value="">Precio Base (x1)</option>
                      {margenes?.map(margen => {
                        const tierText = margen.tierCliente ? ` (${margen.tierCliente})` : '';
                        return (
                          <option key={margen.id} value={margen.id}>
                              {margen.descripcion}{tierText} (x{margen.multiplicador}) 
                          </option>
                        );
                      })}
                  </select>
                </label>
              </div>

              {/* Tercera fila de inputs (Dimensiones y Unidades) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Unidades</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 5" 
                    className="input input-bordered"
                    value={unidades}
                    onChange={(e) => setUnidades(Math.max(1, parseInt(e.target.value) || 1))} // Aseguramos mínimo 1
                    min="1"
                  />
                </label>
                 <label className="form-control w-full">
                  <div className="label"><span className="label-text">Ancho (mm)</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 1200" 
                    className="input input-bordered"
                    value={ancho}
                    onChange={(e) => setAncho(Math.max(0, parseInt(e.target.value) || 0))} // Aseguramos mínimo 0
                    min="0"
                  />
                </label>
                <label className="form-control w-full">
                  <div className="label"><span className="label-text">Largo (mm)</span></div>
                  <input 
                    type="number" 
                    placeholder="Ej: 2000" 
                    className="input input-bordered"
                    value={largo}
                    onChange={(e) => setLargo(Math.max(0, parseInt(e.target.value) || 0))} // Aseguramos mínimo 0
                    min="0"
                  />
                </label>
              </div>
              
              {/* NUEVO: Previsualización de Cálculo */}
              {currentCalculation.isValid && (
                  <div className="alert shadow-lg mt-4 bg-base-200">
                      <div>
                          <Calculator className="w-5 h-5 text-accent" />
                          <div>
                              <h3 className="font-bold">Previsualización (x{unidades} Unidades):</h3>
                              <div className="text-xs">
                                  Precio Unitario: <span className="font-bold text-primary">{formatCurrency(currentCalculation.precioUnitario)}</span> | 
                                  Peso Unitario: <span className="font-bold">{formatWeight(currentCalculation.pesoUnitario)}</span>
                              </div>
                              <div className="text-sm font-bold mt-1">
                                  Total a Añadir: <span className="text-primary">{formatCurrency(currentCalculation.precioTotal)}</span>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="card-actions justify-end mt-4">
                <button 
                  onClick={handleAddItem} 
                  className="btn btn-primary" 
                  disabled={isAddDisabled}
                >
                  {isAddingItem ? <span className="loading loading-spinner loading-xs"></span> : <Plus className="w-4 h-4" />}
                  Añadir Item al Cálculo
                </button>
              </div>
            </div>
          </div>

          {/* Card de Lista de Items */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="card-title">Items Agregados</h2>
                 <div className="flex gap-2">
                     {/* NUEVO BOTÓN: Guardar Presupuesto */}
                     
                     {/* BOTÓN DE EXPORTAR A PDF */}
                     <button onClick={handleExportPDF} className="btn btn-secondary btn-sm" disabled={itemsAgregados.length === 0 || isSaving}>
                        <Download className="w-4 h-4" /> Exportar PDF
                     </button>
                 </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table w-full table-zebra">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="text-center">Medidas (mm)</th>
                      <th className="text-center">Unidades</th>
                      <th className="text-right">Precio Unitario</th> 
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsAgregados.length === 0 && (
                      <tr><td colSpan="5" className="text-center">Añade ítems para verlos aquí.</td></tr>
                    )}
                    {itemsAgregados.map(item => (
                      <tr key={item.id} className="hover">
                        <td className="font-medium">{item.descripcion} {item.margen}</td>
                        <td className="text-center">{item.medidas}</td>
                        <td className="text-center">{item.unidades}</td>
                        <td className="text-right font-bold text-primary">{formatCurrency(item.precioUnitario)}</td>
                        <td className="text-center">
                          <button onClick={() => handleRemoveItem(item.id)} className="btn btn-ghost btn-sm btn-circle">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Resumen de totales debajo de la tabla */}
              <div className="flex justify-end mt-4 text-sm font-semibold">
                <div className="w-full max-w-xs space-y-1">
                    <div className="flex justify-between">
                        <span>Precio Total:</span>
                        <span className="font-bold">{formatCurrency(totalesGenerales.totalPrecio)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Peso Total:</span>
                        <span className="font-bold">{formatWeight(totalesGenerales.totalPeso)}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha (Resultados Totales) - MANTENIDA */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6"> 
             <div className="card bg-base-100 shadow-xl">
               <div className="card-body">
                 <h2 className="card-title mb-4">Resumen de Costes y Pesos</h2>
                 
                 <div className="stats stats-vertical shadow w-full">
                   <TotalDisplay label="Precio Total General" value={formatCurrency(totalesGenerales.totalPrecio)} unit="Precio final (sin IVA)" />
                   <TotalDisplay label="Peso Total General" value={formatWeight(totalesGenerales.totalPeso)} unit="Aproximado" />
                 </div>
                 
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}