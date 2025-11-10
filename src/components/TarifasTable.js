"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/utils/utils'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  // Estado para el margen de simulación
  const [selectedMarginId, setSelectedMarginId] = useState('');
  // Estado: Material seleccionado
  const [selectedMaterial, setSelectedMaterial] = useState('Todos'); 
  
  // 1. Cargar tarifas (precios base)
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  
  // 2. Cargar reglas de margen
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);

  const isLoading = tarifasLoading || margenesLoading;
  
  // 3. Obtener el valor del multiplicador seleccionado
  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    // Usamos 'valor' que es el campo del multiplicador
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);

  // Lista de materiales únicos
  const uniqueMaterials = useMemo(() => {
    if (!tarifas) return [];
    const materials = tarifas.map(t => t.material);
    return ['Todos', ...new Set(materials)].sort();
  }, [tarifas]);

  // Datos filtrados por material
  const filteredTarifas = useMemo(() => {
    if (!tarifas) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
        </div>
        
        {/* Agrupamos los dos selectores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Selector de Margen */}
            <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Simular Precio con Margen:</span></label>
            <select 
                className="select select-bordered"
                value={selectedMarginId}
                onChange={(e) => setSelectedMarginId(e.target.value)}
            >
                <option value="">Precio Base (Sin Margen)</option>
                {margenes?.map(margen => (
                <option key={margen.id} value={margen.id}>
                    {margen.descripcion} ({margen.tipo}) (x{margen.valor})
                </option>
                ))}
            </select>
            </div>

            {/* Selector de Material */}
            <div className="form-control w-full">
            <label className="label"><span className="label-text font-bold">Filtrar por Material:</span></label>
            <select 
                className="select select-bordered"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
            >
                {uniqueMaterials.map(material => (
                <option key={material} value={material}>
                    {material}
                </option>
                ))}
            </select>
            </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th className="text-center">Material</th>
                <th className="text-center">Espesor (mm)</th>
                {/* Mostramos el Precio Base (el valor sin margen del catálogo) */}
                <th className="text-center">Precio Base (€/m²)</th>
                {/* Mostramos el Precio Final (Precio Base * Multiplicador) */}
                <th className="text-center font-bold">Precio Final (€/m²)</th> 
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas?.map(row => { 
                // CÁLCULO: Multiplicamos el precio base por el valor del margen
                const finalPrice = row.precio * (selectedMargin?.valor || 1);
                
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>
                    <td className="text-center">{row.espesor}</td>
                    
                    {/* MOSTRAMOS EL PRECIO BASE (sin formatear) */}
                    <td className="text-center">{row.precio.toFixed(2)} €</td>
                    
                    {/* MOSTRAMOS EL PRECIO CON EL MARGEN APLICADO (formateado) */}
                    <td className="text-center font-bold text-primary">
                       {formatCurrency(finalPrice)}
                    </td>
                    
                    <td className="text-center">{row.peso.toFixed(2)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTarifas.length === 0 && selectedMaterial !== 'Todos' && (
             <div className="text-center py-4 text-gray-500">No hay tarifas para el material seleccionado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
