"use client";
import React from 'react';
import { Settings, DollarSign, Layers } from 'lucide-react';
import CatalogManager from '@/components/CatalogManager';
import { mutate } from 'swr';
import RuleEditorModal from '@/components/RuleEditorModal'; 
import { useState } from 'react';

// Lógica de Descuentos (Necesita Modal Especializado)
// Esta es la única que requiere un manejo especial debido a los tiers anidados.
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
      return true; // Éxito
    } catch (err) {
      throw err;
    }
};

const CustomDiscountManager = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [modalApiError, setModalApiError] = useState(null);
    
    // Función de apertura que pre-carga los tiers (si existen)
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
                // Pasa los handlers custom
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
        
        {/* 2. Descuentos (OCULTADO) */}
        {/*
        <CustomDiscountManager />
        */}
        
        {/* 3. Precios Especiales (OCULTADO) */}
        {/*
        <CatalogManager
          title="Precios Especiales"
          endpoint="/api/pricing/especiales"
          initialForm={{ descripcion: '', clienteId: '', productoId: '', precio: 0 }}
          columns={[
            { key: 'descripcion', label: 'Descripción' },
            { key: 'cliente.nombre', label: 'Cliente' },
            { key: 'producto.nombre', label: 'Producto' },
            { key: 'precio', label: 'Precio (€)' },
          ]}
        />
        */}
        
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
  );
}
