'use client';

import { useState } from 'react';
import RuleEditorModal from './RuleEditorModal'; // Import the modal

// Helper to get the filename for the API
const getFileNameForType = (type) => {
    const map = {
        margins: 'margenes.json',
        discounts: 'descuentos.json',
        specialPrices: 'precios_especiales.json',
    };
    return map[type];
}

// Component to render a table of rules
const RulesTable = ({ title, rules, columns, onAdd, onEdit, onDelete }) => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-bold">{title}</h3>
      <button onClick={onAdd} className="btn btn-primary btn-sm">+ Añadir Regla</button>
    </div>
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => (
            <tr key={rule.id} className="hover">
              {columns.map(col => {
                const value = rule[col.key];
                // Render objects (like tiers) as strings
                if (typeof value === 'object' && value !== null) {
                    return <td key={col.key}>{JSON.stringify(value)}</td>;
                }
                return <td key={col.key}>{value || 'N/A'}</td>;
              })}
              <td className="space-x-2">
                <button onClick={() => onEdit(rule)} className="btn btn-outline btn-xs">Editar</button>
                <button onClick={() => onDelete(rule.id)} className="btn btn-ghost btn-xs">Eliminar</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="text-center">No hay reglas definidas.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default function PricingManager({ initialMargins, initialDiscounts, initialSpecialPrices }) {
  const [activeTab, setActiveTab] = useState('margins');
  
  const [margins, setMargins] = useState(initialMargins);
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [specialPrices, setSpecialPrices] = useState(initialSpecialPrices);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [currentRuleType, setCurrentRuleType] = useState('');

  const stateMap = {
    margins: { data: margins, setter: setMargins },
    discounts: { data: discounts, setter: setDiscounts },
    specialPrices: { data: specialPrices, setter: setSpecialPrices },
  };

  const handleOpenModal = (type, rule = null) => {
    setCurrentRuleType(type);
    setEditingRule(rule || {});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setCurrentRuleType('');
  };

  const handleDelete = async (ruleId, type) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta regla?')) return;

    const filename = getFileNameForType(type);
    try {
      const res = await fetch(`/api/pricing/rules/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId }),
      });
      if (!res.ok) throw new Error('Error al eliminar la regla');
      
      const { setter, data } = stateMap[type];
      setter(data.filter(rule => rule.id !== ruleId));

    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('No se pudo eliminar la regla.');
    }
  };

  const handleSave = async (ruleData) => {
    const filename = getFileNameForType(currentRuleType);
    const isNew = !ruleData.id;
    const method = isNew ? 'POST' : 'PUT';

    try {
        const res = await fetch(`/api/pricing/rules/${filename}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ruleData),
        });
        if (!res.ok) throw new Error('Error al guardar la regla');
        const savedRule = await res.json();

        const { setter, data } = stateMap[currentRuleType];
        if (isNew) {
            setter([...data, savedRule]);
        } else {
            setter(data.map(rule => rule.id === savedRule.id ? savedRule : rule));
        }
        handleCloseModal();
    } catch (error) {
        console.error('Error saving rule:', error);
        alert('No se pudo guardar la regla.');
    }
  };

  const marginColumns = [
    { key: 'descripcion', label: 'Descripción' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'valor', label: 'Valor' },
  ];

  const discountColumns = [
    { key: 'descripcion', label: 'Descripción' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'descuento', label: 'Descuento' },
    { key: 'tiers', label: 'Tiers' },
  ];

  const specialPriceColumns = [
    { key: 'descripcion', label: 'Descripción' },
    { key: 'clienteId', label: 'ID Cliente' },
    { key: 'productoId', label: 'ID Producto' },
    { key: 'precio', label: 'Precio Especial' },
  ];

  return (
    <>
      {isModalOpen && <RuleEditorModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        rule={editingRule}
        ruleType={currentRuleType}
      />}
      <div className="bg-base-100 rounded-lg shadow p-6">
        <div role="tablist" className="tabs tabs-lifted">
            <a role="tab" className={`tab ${activeTab === 'margins' ? 'tab-active' : ''}`} onClick={() => setActiveTab('margins')}>Márgenes</a>
            <a role="tab" className={`tab ${activeTab === 'discounts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('discounts')}>Descuentos</a>
            <a role="tab" className={`tab ${activeTab === 'specialPrices' ? 'tab-active' : ''}`} onClick={() => setActiveTab('specialPrices')}>Precios Especiales</a>
        </div>
        <div className="pt-6">
            {activeTab === 'margins' && <RulesTable title="Reglas de Margen" rules={margins} columns={marginColumns} onAdd={() => handleOpenModal('margins')} onEdit={(rule) => handleOpenModal('margins', rule)} onDelete={(id) => handleDelete(id, 'margins')} />}
            {activeTab === 'discounts' && <RulesTable title="Reglas de Descuento" rules={discounts} columns={discountColumns} onAdd={() => handleOpenModal('discounts')} onEdit={(rule) => handleOpenModal('discounts', rule)} onDelete={(id) => handleDelete(id, 'discounts')} />}
            {activeTab === 'specialPrices' && <RulesTable title="Precios Especiales" rules={specialPrices} columns={specialPriceColumns} onAdd={() => handleOpenModal('specialPrices')} onEdit={(rule) => handleOpenModal('specialPrices', rule)} onDelete={(id) => handleDelete(id, 'specialPrices')} />}
        </div>
      </div>
    </>
  );
}
