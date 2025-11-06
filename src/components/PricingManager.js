'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import RuleEditorModal from './RuleEditorModal'; // Importamos el modal
import { DollarSign, Trash2, Edit } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const ruleConfig = {
    margins: {
        endpoint: '/api/pricing/margenes',
        title: 'Márgenes',
        emptyRule: { descripcion: '', tipo: 'General', valor: 1.5 },
    },
    discounts: {
        endpoint: '/api/pricing/descuentos',
        title: 'Descuentos',
        emptyRule: { descripcion: '', tipo: 'categoria', descuento: 0.1, categoria: '', tiers: [] },
    },
    specialPrices: {
        endpoint: '/api/pricing/especiales',
        title: 'Precios Especiales',
        emptyRule: { descripcion: '', clienteId: '', productoId: '', precio: 0 },
    }
};

export default function PricingManager() {
  const [activeTab, setActiveTab] = useState('margins');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // Objeto de la regla a editar o null
  const [error, setError] = useState(null);

  const { data, isLoading, error: swrError } = useSWR(
    ruleConfig[activeTab].endpoint, 
    fetcher
  );

  const handleOpenModal = (rule = null) => {
    setError(null);
    if (rule) {
      setEditingRule(rule);
    } else {
      setEditingRule(ruleConfig[activeTab].emptyRule); // Crear nueva regla
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleSave = async (ruleData) => {
    const isNew = !ruleData.id;
    const endpoint = ruleConfig[activeTab].endpoint;
    const url = isNew ? endpoint : `${endpoint}/${ruleData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      
      mutate(endpoint); // Revalida el SWR cache
      handleCloseModal();

    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta regla?')) return;
    
    const endpoint = ruleConfig[activeTab].endpoint;
    try {
      const res = await fetch(`${endpoint}/${ruleId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al eliminar');
      }
      
      mutate(endpoint); // Revalida

    } catch (err) {
      alert(err.message);
    }
  };

  const renderContent = () => {
    if (isLoading) return <span className="loading loading-spinner"></span>;
    if (swrError) return <div className="alert alert-error">Error al cargar las reglas.</div>;
    
    return (
      <div className="mt-6 space-y-2">
        <h3 className="text-xl font-bold">Reglas de {ruleConfig[activeTab].title}</h3>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Detalles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(rule => (
                <tr key={rule.id} className="hover">
                  <td>{rule.descripcion || 'N/A'}</td>
                  <td>
                    {/* Detalles específicos por tipo */}
                    {activeTab === 'margins' && `Valor: ${rule.valor}`}
                    {activeTab === 'discounts' && `Tipo: ${rule.tipo}, Desc: ${rule.descuento * 100}%`}
                    {activeTab === 'specialPrices' && `Cliente: ${rule.cliente?.nombre || rule.clienteId} | Prod: ${rule.producto?.nombre || rule.productoId} | Precio: ${rule.precio}€`}
                  </td>
                  <td className="flex gap-2">
                    <button onClick={() => handleOpenModal(rule)} className="btn btn-outline btn-info btn-sm">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="btn btn-outline btn-error btn-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.length === 0 && (
          <p className="text-base-content/70">No hay reglas definidas.</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-base-100 rounded-lg shadow p-6">
      <div role="tablist" className="tabs tabs-lifted">
          <a role="tab" className={`tab ${activeTab === 'margins' ? 'tab-active' : ''}`} onClick={() => setActiveTab('margins')}>Márgenes</a>
          <a role="tab" className={`tab ${activeTab === 'discounts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('discounts')}>Descuentos</a>
          <a role="tab" className={`tab ${activeTab === 'specialPrices' ? 'tab-active' : ''}`} onClick={() => setActiveTab('specialPrices')}>Precios Especiales</a>
      </div>
      <div className="pt-6">
          <button onClick={() => handleOpenModal()} className="btn btn-primary mb-4">Añadir Nueva Regla</button>
          
          {renderContent()}
      </div>

      {isModalOpen && (
        <RuleEditorModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          rule={editingRule}
          ruleType={activeTab}
          apiError={error} // Pasamos el error al modal
        />
      )}
    </div>
  );
}
