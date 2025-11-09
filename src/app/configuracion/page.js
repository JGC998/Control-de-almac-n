"use client";
import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import DataManagerTable from '@/components/DataManagerTable';
import RuleEditorModal from '@/components/RuleEditorModal'; // Importar modal especializado
import { mutate } from 'swr'; // Necesario para mutar la lista de descuentos

// Definiciones de campos para cada modelo
const TarifaMaterialFields = [
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'espesor', label: 'Espesor (mm)', type: 'float' },
  { key: 'precio', label: 'Precio (€/m²)', type: 'float' },
  { key: 'peso', label: 'Peso (kg/m²)', type: 'float' },
];

const ReferenciaBobinaFields = [
  { key: 'referencia', label: 'Nombre/Referencia', type: 'text' }, 
  { key: 'ancho', label: 'Ancho (mm)', type: 'number' },
  { key: 'lonas', label: 'Lonas', type: 'number' },
  { key: 'pesoPorMetroLineal', label: 'Peso/m lineal (kg)', type: 'float' },
];

const MaterialesFields = [
  { key: 'nombre', label: 'Nombre del Material', type: 'text' },
];

// CAMPOS DE MARGENES
const MargenesFields = [
  { key: 'base', label: 'Tipo de Tarifa', type: 'text' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'multiplicador', label: 'Multiplicador (ej. 1.5)', type: 'float' },
  { key: 'gastoFijo', label: 'Gasto Fijo (€)', type: 'float' },
];

// CAMPOS DE DESCUENTOS (Solo se usan para la tabla de visualización)
const DescuentosFields = [
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'tipo', label: 'Tipo', type: 'text' },
  { key: 'descuento', label: 'Descuento (%)', type: 'float' }, // Descuento base (no para volumen)
  { key: 'tierCliente', label: 'Tier Cliente', type: 'text' },
];


export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('tarifas'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [modalApiError, setModalApiError] = useState(null);
  
  // Custom Handler para abrir el modal especializado (Descuentos)
  const handleOpenCustomModal = (record) => {
    setEditingRule(record);
    setModalApiError(null);
    setIsModalOpen(true);
  };
  
  // Custom Handler para el guardado de Descuentos
  const handleSaveDiscount = async (ruleData) => {
    const isNew = !ruleData.id;
    const endpoint = '/api/pricing/descuentos';
    const url = isNew ? endpoint : `/api/pricing/descuentos/${ruleData.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    setModalApiError(null);

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar la regla de descuento');
      }
      
      mutate(endpoint); 
      setIsModalOpen(false);

    } catch (err) {
      setModalApiError(err.message);
    }
  };


  const tabs = [
    { id: 'tarifas', label: 'Tarifas Base', apiEndpoint: "/api/precios", fields: TarifaMaterialFields },
    { id: 'referencias', label: 'Ref. Bobina', apiEndpoint: "/api/configuracion/referencias", fields: ReferenciaBobinaFields }, 
    { id: 'materiales', label: 'Materiales', apiEndpoint: "/api/materiales", fields: MaterialesFields },
    { id: 'descuentos', label: 'Descuentos', apiEndpoint: "/api/pricing/descuentos", fields: DescuentosFields, isCustom: true }, // Marcamos como custom
    { id: 'margenes', label: 'Márgenes', apiEndpoint: "/api/pricing/margenes", fields: MargenesFields },
  ];

  // Componente que decide qué renderizar basado en la pestaña activa
  const renderTabComponent = (tab) => {
      if (tab.id === 'descuentos') {
          return <DataManagerTable 
            apiEndpoint={tab.apiEndpoint} 
            modelName={tab.label} 
            fields={tab.fields}
            idField="id"
            onOpenCustomModal={handleOpenCustomModal}
            useCustomModal={true}
          />;
      }
      
      // Renderizar DataManagerTable genérico para el resto
      return <DataManagerTable 
          apiEndpoint={tab.apiEndpoint} 
          modelName={tab.label} 
          fields={tab.fields}
          idField="id"
      />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-2" /> Configuración Central de Datos
      </h1>

      {/* Navegación de Pestañas (Tabs) */}
      <div role="tablist" className="tabs tabs-boxed">
        {tabs.map(tab => (
          <a
            key={tab.id}
            role="tab"
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div className="mt-4 bg-base-100 shadow-xl rounded-box">
        {tabs.map(tab => activeTab === tab.id ? (
             <div key={tab.id}>
                {renderTabComponent(tab)}
             </div>
        ) : null)}
      </div>
      
      {/* Modal Especializado para Descuentos */}
      {isModalOpen && (
        <RuleEditorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveDiscount}
          rule={editingRule}
          ruleType="descuentos" 
          apiError={modalApiError} 
        />
      )}

    </div>
  );
}
