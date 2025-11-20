"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Settings, DollarSign, Layers, TrendingUp } from 'lucide-react';
import CatalogManager from '@/components/CatalogManager';
import RuleEditorModal from '@/components/RuleEditorModal'; 
import BulkPriceUpdateModal from '@/components/BulkPriceUpdateModal'; // IMPORTADO

const fetcher = (url) => fetch(url).then((res) => res.json());

// Lógica de Descuentos (Mantenida igual)
const handleSaveDiscount = async (ruleData, isNew) => {
    const endpoint = '/api/pricing/descuentos';
    const url = isNew ? endpoint : `/api/pricing/descuentos/${ruleData.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
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
      return true; 
    } catch (err) {
      throw err;
    }
};

const CustomDiscountManager = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [modalApiError, setModalApiError] = useState(null);
    
    const handleOpenModal = (record = null) => {
        setEditingRule(record || { descripcion: '', tipo: 'categoria', descuento: 0.1, categoria: '', tiers: [] });
        setModalApiError(null);
        setIsModalOpen(true);
    };

    const handleSave = async (ruleData) => {
        setModalApiError(null);
        try {
            const isNew = !ruleData.id;
            await handleSaveDiscount(ruleData, isNew);
            setIsModalOpen(false);
        } catch (err) {
            setModalApiError(err.message);
        }
    }

    return (
        <>
            <CatalogManager
                title="Reglas de Descuento"
                endpoint="/api/pricing/descuentos"
                initialForm={{ descripcion: '', tipo: '', descuento: 0 }}
                columns={[
                    { key: 'descripcion', label: 'Descripción' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'descuento', label: 'Descuento Base' },
                ]}
                onOpenCustomModal={handleOpenModal}
                useCustomModal={true}
            />
            
            {isModalOpen && (
                <RuleEditorModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    rule={editingRule}
                    ruleType="discounts" 
                    apiError={modalApiError} 
                />
            )}
        </>
    );
};


export default function ConfiguracionPage() {
  // Estado para el modal de actualización masiva
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // Necesitamos cargar materiales para el desplegable del modal
  const { data: materiales } = useSWR('/api/materiales', fetcher);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-2" /> Gestión de Reglas y Catálogos
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* === SECCIÓN DE REGLAS DE PRECIO === */}
        <h2 className="lg:col-span-2 text-2xl font-bold flex items-center mb-2 mt-4 text-primary"><DollarSign className="mr-2" /> Reglas de Precio y Márgenes</h2>
        
        {/* 1. Márgenes */}
        <CatalogManager
          title="Reglas de Margen"
          endpoint="/api/pricing/margenes"
          initialForm={{ descripcion: '', base: '', multiplicador: 1.0, gastoFijo: 0.0, tipo: 'General', tierCliente: '' }}
          columns={[
            { key: 'descripcion', label: 'Descripción' },
            { key: 'base', label: 'Base' },
            { key: 'multiplicador', label: 'Multiplicador' },
            { key: 'gastoFijo', label: 'Gasto Fijo (€)' },
          ]}
        />
        
        {/* === SECCIÓN DE CATÁLOGOS BASE === */}
        <h2 className="lg:col-span-2 text-2xl font-bold flex items-center mb-2 mt-6 text-primary"><Layers className="mr-2" /> Catálogos de Inventario</h2>

        {/* 4. Referencias Bobina */}
        <CatalogManager
          title="Referencias de Bobina"
          endpoint="/api/configuracion/referencias"
          initialForm={{ nombre: '', ancho: '', lonas: '', pesoPorMetroLineal: '' }}
          columns={[
            { key: 'referencia', label: 'Referencia' },
            { key: 'ancho', label: 'Ancho (mm)' },
            { key: 'lonas', label: 'Lonas' },
            { key: 'pesoPorMetroLineal', label: 'Peso (kg/m)' },
          ]}
        />

        {/* 5. Tarifas Material */}
        <div className="relative">
            {/* BOTÓN INYECTADO SOBRE EL COMPONENTE */}
            <div className="absolute top-4 right-36 z-10">
                 <button 
                    onClick={() => setIsBulkModalOpen(true)} 
                    className="btn btn-sm btn-warning btn-outline gap-1"
                    title="Subir o bajar precios masivamente"
                 >
                    <TrendingUp className="w-3 h-3" /> Actualizar %
                 </button>
            </div>

            <CatalogManager
              title="Tarifas de Material"
              endpoint="/api/precios"
              initialForm={{ material: '', espesor: '', precio: '', peso: '' }}
              columns={[
                { key: 'material', label: 'Material' },
                { key: 'espesor', label: 'Espesor (mm)' },
                { key: 'precio', label: 'Precio (€/m²)' },
                { key: 'peso', label: 'Peso (kg/m²)' },
              ]}
            />
        </div>
        
      </div>

      {/* MODAL DE ACTUALIZACIÓN MASIVA */}
      <BulkPriceUpdateModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        materiales={materiales}
        onSuccess={() => mutate('/api/precios')} 
      />
    </div>
  );
}