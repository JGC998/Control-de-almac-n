"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utils'; // Importar utilidades de formato

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
  // Eliminado: selectedProducto
  // Eliminado: clienteId
  const [unidades, setUnidades] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [largo, setLargo] = useState(0);
  
  // --- Estado para la lista de items ---
  const [itemsAgregados, setItemsAgregados] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false); // Loading state

  // 1. Cargar datos necesarios (Solo Tarifas y Materiales)
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: materiales, error: materialesError, isLoading: materialesLoading } = useSWR('/api/materiales', fetcher);
  
  const isLoading = tarifasLoading || materialesLoading;

  // 2. Derivar listas únicas para los selectores
  const availableEspesores = useMemo(() => {
    if (!tarifas || !selectedMaterial) return [];
    
    const espesores = tarifas
      .filter(t => t.material === selectedMaterial)
      .map(t => String(t.espesor));
    
    return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, selectedMaterial]);

  // 3. Resetear espesor si el material cambia
  useEffect(() => {
    setSelectedEspesor('');
  }, [selectedMaterial]);


  // 4. Calcular los totales generales de la lista
  const totalesGenerales = useMemo(() => {
    const totalPrecio = itemsAgregados.reduce((acc, item) => acc + item.precioTotal, 0);
    const totalPeso = itemsAgregados.reduce((acc, item) => acc + item.pesoTotal, 0);
    return { totalPrecio, totalPeso };
  }, [itemsAgregados]);

  // 5. Handler para añadir un item a la lista (MODIFICADO PARA USAR PRECIO BASE)
  const handleAddItem = async () => {
    if (!selectedMaterial || !selectedEspesor || !unidades || unidades <= 0 || ancho <= 0 || largo <= 0) {
      alert("Por favor, selecciona Material, Espesor, Unidades, Ancho y Largo válidos.");
      return;
    }

    setIsAddingItem(true);

    try {
      // Buscar la tarifa base
      const tarifa = tarifas?.find(t => 
        t.material === selectedMaterial && 
        t.espesor == selectedEspesor
      );
      
      if (!tarifa) {
          throw new Error('No se encontró una tarifa para esta combinación de Material/Espesor.');
      }
      
      // Cálculo del Precio Total
      // Precio Total = Precio/m² * Área Total (m²)
      const areaPorPieza = (ancho / 1000) * (largo / 1000); 
      const precioUnitario = tarifa.precio * areaPorPieza; 
      const precioTotal = precioUnitario * unidades;
      
      // Cálculo del Peso Total
      // Peso Total = Peso/m² * Área Total (m²)
      const pesoUnitario = tarifa.peso * areaPorPieza;
      const pesoTotal = pesoUnitario * unidades;

      const newItem = {
        id: Date.now(),
        descripcion: `${selectedMaterial} (${selectedEspesor}mm)`,
        medidas: `${ancho} mm x ${largo} mm`,
        unidades: unidades,
        precioUnitario: precioUnitario, 
        pesoUnitario: pesoUnitario,
        precioTotal: precioTotal,
        pesoTotal: pesoTotal,
      };

      setItemsAgregados(prev => [...prev, newItem]);
      
      // Resetear inputs (excepto Material, que puede ser reutilizado)
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

  // 6. Handler para eliminar un item
  const handleRemoveItem = (id) => {
    setItemsAgregados(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || materialesError) return <div className="text-red-500 text-center">Error al cargar datos necesarios.</div>;

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
              
              {/* Primera fila de inputs (Material y Espesor) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
              </div>

              {/* Segunda fila de inputs (Dimensiones y Unidades) */}
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
              <h2 className="card-title">Items Agregados</h2>
              <div className="overflow-x-auto">
                <table className="table w-full table-zebra">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="text-center">Medidas (mm)</th>
                      <th className="text-center">Unidades</th>
                      <th className="text-right">P. Unitario</th>
                      <th className="text-right">P. Total</th>
                      <th className="text-right">Peso Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsAgregados.length === 0 && (
                      <tr><td colSpan="7" className="text-center">Añade items para verlos aquí.</td></tr>
                    )}
                    {itemsAgregados.map(item => (
                      <tr key={item.id} className="hover">
                        <td className="font-medium">{item.descripcion}</td>
                        <td className="text-center">{item.medidas}</td>
                        <td className="text-center">{item.unidades}</td>
                        <td className="text-right">{formatCurrency(item.precioUnitario)}</td>
                        <td className="text-right font-bold">{formatCurrency(item.precioTotal)}</td>
                        <td className="text-right">{formatWeight(item.pesoTotal)}</td>
                        <td className="text-center">
                          <button onClick={() => handleRemoveItem(item.id)} className="btn btn-ghost btn-sm btn-circle">
                            <Trash2 className="w-4 h-4 text-red-500" />
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

        {/* Columna Derecha (Resultados Totales) */}
        <div className="lg:col-span-1 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Total General</h2>
            
            <div className="stats stats-vertical shadow">
              {/* Muestra el total formateado */}
              <TotalDisplay label="Precio Total General" value={formatCurrency(totalesGenerales.totalPrecio)} unit="Precio base (sin IVA)" />
              <TotalDisplay label="Peso Total General" value={formatWeight(totalesGenerales.totalPeso)} unit="Aproximado" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
