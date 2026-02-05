"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Settings, DollarSign, Layers, TrendingUp, Package, Wrench } from 'lucide-react';
import Link from 'next/link';
import GestorCatalogo from '@/componentes/productos/GestorCatalogo';
import RuleEditorModal from '@/componentes/modales/ModalEditorReglas';
import BulkPriceUpdateModal from '@/componentes/modales/ModalActualizacionPrecios';

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
      <GestorCatalogo
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
  const [activeTab, setActiveTab] = useState('tarifas');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const { data: materiales } = useSWR('/api/materiales', fetcher);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-2" /> Configuración del Sistema
      </h1>

      {/* Tabs Navigation */}
      <div className="tabs tabs-boxed mb-6">
        <a
          className={`tab tab-lg ${activeTab === 'tarifas' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tarifas')}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Tarifas y Precios
        </a>
        <a
          className={`tab tab-lg ${activeTab === 'catalogo' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('catalogo')}
        >
          <Package className="w-4 h-4 mr-2" />
          Catálogo
        </a>
        <a
          className={`tab tab-lg ${activeTab === 'sistema' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('sistema')}
        >
          <Wrench className="w-4 h-4 mr-2" />
          Sistema
        </a>
      </div>

      {/* Tab Content: TARIFAS Y PRECIOS */}
      {activeTab === 'tarifas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <h2 className="lg:col-span-2 text-2xl font-bold flex items-center mb-2 text-primary">
            <DollarSign className="mr-2" /> Gestión de Tarifas y Márgenes
          </h2>

          {/* Márgenes */}
          <GestorCatalogo
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

          {/* Tarifas Material */}
          <div className="relative">
            <div className="absolute top-4 right-36 z-10">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="btn btn-sm btn-warning btn-outline gap-1"
                title="Subir o bajar precios masivamente"
              >
                <TrendingUp className="w-3 h-3" /> Actualizar %
              </button>
            </div>

            <GestorCatalogo
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
      )}

      {/* Tab Content: CATÁLOGO */}
      {activeTab === 'catalogo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <h2 className="lg:col-span-2 text-2xl font-bold flex items-center mb-2 text-primary">
            <Package className="mr-2" /> Gestión de Catálogo
          </h2>

          {/* Enlace a Tacos */}
          <div className="lg:col-span-2">
            <Link href="/configuracion/tacos" className="btn btn-primary btn-lg gap-2">
              <Layers className="w-5 h-5" />
              Gestionar Precios de Tacos
            </Link>
            <p className="text-sm text-base-content/70 mt-2">
              Configura los precios por metro lineal de tacos rectos e inclinados
            </p>
          </div>

          {/* Referencias Bobina */}
          <GestorCatalogo
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
        </div>
      )}

      {/* Tab Content: SISTEMA */}
      {activeTab === 'sistema' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <h2 className="lg:col-span-2 text-2xl font-bold flex items-center mb-2 text-primary">
            <Wrench className="mr-2" /> Configuración del Sistema
          </h2>

          <div className="alert alert-info lg:col-span-2">
            <Wrench className="w-5 h-5" />
            <span>Configuraciones generales del sistema próximamente disponibles</span>
          </div>
        </div>
      )}

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