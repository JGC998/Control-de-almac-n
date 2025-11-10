"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { formatCurrency } from '@/utils/utils'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  // Estado para almacenar el ID del margen seleccionado
  const [selectedMarginId, setSelectedMarginId] = useState('');
  
  // 1. Cargar tarifas (precios base)
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  
  // 2. Cargar reglas de margen
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);

  const isLoading = tarifasLoading || margenesLoading;
  
  // 3. Obtener el valor del multiplicador seleccionado
  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);


  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
        </div>
        
        {/* Selector de Margen */}
        <div className="form-control w-full max-w-xs mb-6">
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

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="table table-zebra table-pin-rows table-sm w-full">
            <thead>
              <tr>
                <th className="text-center">Material</th>
                <th className="text-center">Espesor (mm)</th>
                <th className="text-center">Precio Base (€/m²)</th>
                {/* Nueva Columna de Precio Sugerido */}
                <th className="text-center font-bold">Precio Sugerido (€/m²)</th>
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {tarifas?.map(row => {
                // Cálculo: Precio Base * Multiplicador (o 1 si no hay selección)
                const finalPrice = row.precio * (selectedMargin?.valor || 1);
                
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>
                    <td className="text-center">{row.espesor}</td>
                    <td className="text-center">{row.precio.toFixed(2)} €</td>
                    {/* Mostrar Precio Sugerido */}
                    <td className="text-center font-bold text-primary">
                       {formatCurrency(finalPrice)}
                    </td>
                    <td className="text-center">{row.peso.toFixed(2)} kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
