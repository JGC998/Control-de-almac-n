"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2, Download } from 'lucide-react'; 
import { formatCurrency, formatWeight } from '@/utils/utils';
import jsPDF from "jspdf"; // Importar jspdf
// CORRECCIÓN: Importación explícita para evitar problemas con el parche de prototipo.
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


  // 5. Calcular los totales generales de la lista
  const totalesGenerales = useMemo(() => {
    const totalPrecio = itemsAgregados.reduce((acc, item) => acc + item.precioTotal, 0);
    const totalPeso = itemsAgregados.reduce((acc, item) => acc + item.pesoTotal, 0);
    return { totalPrecio, totalPeso };
  }, [itemsAgregados]);

  // 6. Handler para añadir un item a la lista
  const handleAddItem = async () => {
    if (!selectedMaterial || !selectedEspesor || !unidades || unidades <= 0 || ancho <= 0 || largo <= 0) {
      alert("Por favor, selecciona Material, Espesor, Unidades, Ancho y Largo válidos.");
      return;
    }

    setIsAddingItem(true);

    try {
      const tarifa = tarifas?.find(t => 
        t.material === selectedMaterial && 
        t.espesor == selectedEspesor
      );
      
      if (!tarifa) {
          throw new Error('No se encontró una tarifa para esta combinación de Material/Espesor.');
      }
      
      const multiplicador = selectedMargin?.multiplicador || 1;
      const precioM2ConMargen = tarifa.precio * multiplicador; 
      
      const areaPorPieza = (ancho / 1000) * (largo / 1000); 
      const precioUnitario = precioM2ConMargen * areaPorPieza; 
      const precioTotal = precioUnitario * unidades;
      
      const pesoUnitario = tarifa.peso * areaPorPieza;
      const pesoTotal = pesoUnitario * unidades;

      const marginText = selectedMargin ? ` (x${multiplicador.toFixed(2)})` : '';

      const newItem = {
        id: Date.now(),
        descripcion: `${selectedMaterial} (${selectedEspesor}mm)`,
        medidas: `${ancho} mm x ${largo} mm`,
        unidades: unidades,
        precioUnitario: precioUnitario, 
        pesoUnitario: pesoUnitario,
        precioTotal: precioTotal,
        pesoTotal: pesoTotal,
        margen: marginText 
      };

      setItemsAgregados(prev => [...prev, newItem]);
      
      setSelectedEspesor('');
      setUnidades(1);
      setAncho(0);
      setLargo(0);

    } catch (error) {
      console.error("Error al añadir item:", error);
      alert(`Error al calcular: ${error.message}`);
    } finally {
      setIsAddingItem(false);
    }
  };

  // 7. Handler para eliminar un item
  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };
  
  // 8. Handler para generar PDF (Nuevo)
  const handleExportPDF = () => {
    if (itemsAgregados.length === 0) {
      alert("No hay ítems para exportar.");
      return;
    }
    
    // Crear instancia de jsPDF
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Simulación de Cálculo", 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
    
    // Preparar datos de la tabla (solo 4 columnas de datos)
    const tableColumn = ["Descripción", "Medidas (mm)", "Unidades", "Precio Unitario"];
    const tableRows = itemsAgregados.map(item => [
      item.descripcion + item.margen,
      item.medidas,
      item.unidades,
      formatCurrency(item.precioUnitario),
    ]);

    // Generar tabla llamando a autoTable de forma explícita
    // La función 'autoTable' se importa directamente arriba.
    autoTable(doc, { 
      head: [tableColumn],
      body: tableRows,
      startY: 40, 
      theme: 'grid',
    });

    // Añadir totales
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
                    onChange={(e) => setUnidades(parseInt(e.target.value) || 1)}
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
                    onChange={(e) => setAncho(parseInt(e.target.value) || 0)}
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
                    onChange={(e) => setLargo(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </label>
              </div>

              <div className="card-actions justify-end mt-4">
                <button 
                  onClick={handleAddItem} 
                  className="btn btn-primary" 
                  disabled={isAddingItem || !selectedMaterial || !selectedEspesor || unidades <= 0 || ancho <= 0 || largo <= 0}
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
                 {/* BOTÓN DE EXPORTAR A PDF AÑADIDO AQUÍ */}
                 <button onClick={handleExportPDF} className="btn btn-secondary btn-sm" disabled={itemsAgregados.length === 0}>
                    <Download className="w-4 h-4" /> Exportar PDF
                 </button>
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
