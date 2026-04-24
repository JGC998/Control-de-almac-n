"use client";
import React, { useState } from 'react';
import { FileSpreadsheet, DollarSign, ScrollText } from 'lucide-react';
import TablaTarifas from '@/componentes/productos/TablaTarifas';
import TablaTarifasRollo from '@/componentes/productos/TablaTarifasRollo';

export default function TarifasPage() {
  const [activeTab, setActiveTab] = useState('m2');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
        <FileSpreadsheet className="text-primary" /> Gestión de Tarifas
      </h1>

      <div className="tabs tabs-boxed mb-6 gap-1">
        <button
          className={`tab gap-2 ${activeTab === 'm2' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('m2')}
        >
          <DollarSign className="w-4 h-4" /> Tarifas por m²
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'rollo' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('rollo')}
        >
          <ScrollText className="w-4 h-4" /> Tarifas por rollo
        </button>
      </div>

      {activeTab === 'm2' && <TablaTarifas />}
      {activeTab === 'rollo' && <TablaTarifasRollo />}
    </div>
  );
}
