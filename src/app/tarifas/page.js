"use client";
import React, { useState } from 'react';
import { FileSpreadsheet, DollarSign, ScrollText, History } from 'lucide-react';
import TablaTarifas from '@/componentes/productos/TablaTarifas';
import TablaTarifasRollo from '@/componentes/productos/TablaTarifasRollo';
import LogViewer from '@/componentes/admin/LogViewer';

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
        <button
          className={`tab gap-2 ${activeTab === 'historial' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          <History className="w-4 h-4" /> Historial de cambios
        </button>
      </div>

      {activeTab === 'm2' && <TablaTarifas />}
      {activeTab === 'rollo' && <TablaTarifasRollo />}
      {activeTab === 'historial' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-2">Historial de cambios en tarifas</h2>
            <p className="text-sm text-base-content/60 mb-4">
              Registro de todas las altas, modificaciones y eliminaciones de precios.
            </p>
            <LogViewer defaultEntity="TarifaMaterial" />
          </div>
        </div>
      )}
    </div>
  );
}
