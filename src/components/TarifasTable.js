"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link'; // Importar Link
import { formatCurrency } from '@/utils/utils'; 
import { Download, Settings } from 'lucide-react'; // Importar Settings
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable"; 

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasTable() {
  const [selectedMarginId, setSelectedMarginId] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('Todos'); 
  
  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: margenes, error: margenesError, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);

  const isLoading = tarifasLoading || margenesLoading;
  
  const selectedMargin = useMemo(() => {
    if (!margenes || !selectedMarginId) return null;
    return margenes.find(m => m.id === selectedMarginId);
  }, [margenes, selectedMarginId]);

  const uniqueMaterials = useMemo(() => {
    if (!tarifas) return [];
    const materials = tarifas.map(t => t.material);
    return ['Todos', ...new Set(materials)].sort();
  }, [tarifas]);

  const filteredTarifas = useMemo(() => {
    if (!tarifas) return [];
    if (selectedMaterial === 'Todos') return tarifas;
    return tarifas.filter(t => t.material === selectedMaterial);
  }, [tarifas, selectedMaterial]);

  const handleExportPDF = () => {
    if (filteredTarifas.length === 0) {
        alert("No hay tarifas para exportar.");
        return;
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Tabla de Tarifas de Materiales", 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const margenText = selectedMargin 
        ? `Margen Aplicado: ${selectedMargin.descripcion} (x${selectedMargin.multiplicador})`
        : 'Margen Aplicado: Ninguno (Precio Base)';
        
    doc.text(`Filtro: ${selectedMaterial}`, 14, 30);
    doc.text(margenText, 14, 36);

    // Columnas ajustadas para incluir Precio Base
    const tableColumn = ["Material", "Espesor (mm)", "Precio Base (€/m²)", "Precio Final (€/m²)", "Peso (kg/m²)"];
    
    // Filas ajustadas
    const tableRows = filteredTarifas.map(row => {
        const finalPrice = row.precio * (selectedMargin?.multiplicador || 1);
        return [
            row.material,
            row.espesor.toFixed(2),
            row.precio.toFixed(2) + ' €', // Precio Base
            finalPrice.toFixed(2) + ' €', // Precio Final
            row.peso.toFixed(2) + ' kg',
        ];
    });

    autoTable(doc, { 
      head: [tableColumn],
      body: tableRows,
      startY: 45, 
      theme: 'grid',
    });
    
    const fileName = selectedMaterial === 'Todos' 
        ? `tarifas-completas-${new Date().toISOString().slice(0, 10)}.pdf`
        : `tarifa-${selectedMaterial.toLowerCase().replace(/\s/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;

    doc.save(fileName);
  };
  // --- FIN NUEVA FUNCIÓN ---


  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (tarifasError || margenesError) return <div className="text-red-500 text-center">Error al cargar datos.</div>;

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Tabla de Tarifas por Material</h2>
          <div className="flex gap-2">
             {/* NUEVO: Botón de gestión */}
             <Link href="/configuracion">
                <button className="btn btn-neutral btn-sm">
                    <Settings className="w-4 h-4" /> Gestionar Precios Base
                </button>
             </Link>
             {/* Existente: Botón de Imprimir */}
             <button 
                 onClick={handleExportPDF} 
                 className="btn btn-secondary btn-sm"
                 disabled={filteredTarifas.length === 0}
             >
                <Download className="w-4 h-4" /> Imprimir Tarifa
             </button>
          </div>
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
                {margenes?.map(margen => {
                  const tierText = margen.tierCliente ? ` (${margen.tierCliente})` : '';
                  return (
                    <option key={margen.id} value={margen.id}>
                        {margen.descripcion}{tierText} (x{margen.multiplicador})
                    </option>
                  );
                })}
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
                {/* Modificado para claridad */}
                <th className="text-center">Precio Base (€/m²)</th> 
                <th className="text-center font-bold">Precio Final (€/m²)</th> 
                <th className="text-center">Peso (kg/m²)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTarifas?.map(row => { 
                const finalPrice = row.precio * (selectedMargin?.multiplicador || 1);
                
                return (
                  <tr key={row.id} className="hover">
                    <td className="font-bold text-center">{row.material}</td>
                    <td className="text-center">{row.espesor}</td>
                    {/* Precio Base */}
                    <td className="text-center opacity-70">
                       {formatCurrency(row.precio)}
                    </td>
                    {/* Precio Final (destacado) */}
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