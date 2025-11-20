"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Table, FileSpreadsheet, TrendingUp } from 'lucide-react'; // Importa TrendingUp
import TarifasTable from '@/components/TarifasTable';
import BulkPriceUpdateModal from '@/components/BulkPriceUpdateModal'; // Importa el Modal

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TarifasPage() {
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // Estado para el modal

  const { data: tarifas, error: tarifasError, isLoading: tarifasLoading } = useSWR('/api/precios', fetcher);
  const { data: materiales, error: materialesError } = useSWR('/api/materiales', fetcher);

  const handleDataChange = () => {
    mutate('/api/precios');
  };

  if (tarifasError || materialesError) return <div className="text-red-500">Error al cargar los datos.</div>;
  if (tarifasLoading) return <div className="flex justify-center p-8"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <FileSpreadsheet className="mr-2 text-primary" /> Gestión de Tarifas
        </h1>
        

      </div>

      <div className="bg-base-100 rounded-lg shadow-xl p-6">
        <TarifasTable 
          initialTarifas={tarifas} 
          materiales={materiales} 
          onDataChange={handleDataChange} 
        />
      </div>

      {/* MODAL DE ACTUALIZACIÓN MASIVA */}
      <BulkPriceUpdateModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        materiales={materiales}
        onSuccess={handleDataChange}
      />
    </div>
  );
}