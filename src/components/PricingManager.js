'use client';

import { useState } from 'react';
// Helper to get the filename for the API
const getFileNameForType = (type) => {
    const map = {
        margins: 'margenes.json',
        discounts: 'descuentos.json',
        specialPrices: 'precios_especiales.json',
    };
    return map[type];
}

export default function PricingManager({ initialMargins, initialDiscounts, initialSpecialPrices }) {
  const [activeTab, setActiveTab] = useState('margins');
  
  const [margins, setMargins] = useState(initialMargins);
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [specialPrices, setSpecialPrices] = useState(initialSpecialPrices);

  const [editingRuleId, setEditingRuleId] = useState(null); // null for new rule, id for existing
  const [editingRuleData, setEditingRuleData] = useState(null); // Data for the rule being edited/created

  const getEmptyRule = (type) => {
    switch (type) {
      case 'margins': return { descripcion: '', tipo: '', categoria: '', valor: '' };
      case 'discounts': return { descripcion: '', tipo: '', descuento: '', tiers: '' };
      case 'specialPrices': return { descripcion: '', clienteId: '', productoId: '', precio: '' };
      default: return {};
    }
  };

  const stateMap = {
    margins: { data: margins, setter: setMargins },
    discounts: { data: discounts, setter: setDiscounts },
    specialPrices: { data: specialPrices, setter: setSpecialPrices },
  };

  const handleSave = async () => {
    if (!editingRuleData) return;

    const filename = getFileNameForType(activeTab);
    const isNew = !editingRuleData.id;
    const method = isNew ? 'POST' : 'PUT';

    try {
        const res = await fetch(`/api/pricing/rules/${filename}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingRuleData),
        });
        if (!res.ok) throw new Error('Error al guardar la regla');
        const savedRule = await res.json();

        const { setter, data } = stateMap[activeTab];
        if (isNew) {
            setter([...data, savedRule]);
        } else {
            setter(data.map(rule => rule.id === savedRule.id ? savedRule : rule));
        }
        setEditingRuleId(null);
        setEditingRuleData(null);
    } catch (error) {
        console.error('Error saving rule:', error);
        alert('No se pudo guardar la regla.');
    }
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

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    setEditingRuleData({ ...rule });
  };

  const handleAddNewClick = () => {
    setEditingRuleId(null);
    setEditingRuleData(getEmptyRule(activeTab));
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setEditingRuleData(null);
  };

  const renderRuleForm = () => {
    if (!editingRuleData) return null;

    const isNew = !editingRuleData.id;

    const commonFields = (
      <div className="form-control w-full">
        <label className="label"><span className="label-text">Descripción</span></label>
        <input 
          type="text" 
          value={editingRuleData.descripcion || ''} 
          onChange={(e) => setEditingRuleData({ ...editingRuleData, descripcion: e.target.value })}
          placeholder="Descripción" 
          className="input input-bordered w-full" 
        />
      </div>
    );

    switch (activeTab) {
      case 'margins':
        return (
          <div className="space-y-4 p-4 border rounded-md bg-base-200">
            <h4 className="text-lg font-bold">{isNew ? 'Añadir Nueva Regla de Margen' : 'Editar Regla de Margen'}</h4>
            {commonFields}
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Tipo</span></label>
              <input 
                type="text" 
                value={editingRuleData.tipo || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, tipo: e.target.value })}
                placeholder="Tipo" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Categoría</span></label>
              <input 
                type="text" 
                value={editingRuleData.categoria || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, categoria: e.target.value })}
                placeholder="Categoría" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Valor</span></label>
              <input 
                type="number" 
                value={editingRuleData.valor || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, valor: parseFloat(e.target.value) })}
                placeholder="Valor" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={handleSave} className="btn btn-primary">Guardar</button>
              <button onClick={handleCancelEdit} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        );
      case 'discounts':
        return (
          <div className="space-y-4 p-4 border rounded-md bg-base-200">
            <h4 className="text-lg font-bold">{isNew ? 'Añadir Nueva Regla de Descuento' : 'Editar Regla de Descuento'}</h4>
            {commonFields}
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Tipo</span></label>
              <input 
                type="text" 
                value={editingRuleData.tipo || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, tipo: e.target.value })}
                placeholder="Tipo" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Descuento</span></label>
              <input 
                type="number" 
                value={editingRuleData.descuento || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, descuento: parseFloat(e.target.value) })}
                placeholder="Descuento" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Tiers (JSON)</span></label>
              <textarea 
                value={typeof editingRuleData.tiers === 'object' ? JSON.stringify(editingRuleData.tiers, null, 2) : editingRuleData.tiers || ''} 
                onChange={(e) => {
                  try {
                    setEditingRuleData({ ...editingRuleData, tiers: JSON.parse(e.target.value) });
                  } catch (error) {
                    setEditingRuleData({ ...editingRuleData, tiers: e.target.value });
                  }
                }}
                placeholder="Tiers (JSON)" 
                className="textarea textarea-bordered w-full" 
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={handleSave} className="btn btn-primary">Guardar</button>
              <button onClick={handleCancelEdit} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        );
      case 'specialPrices':
        return (
          <div className="space-y-4 p-4 border rounded-md bg-base-200">
            <h4 className="text-lg font-bold">{isNew ? 'Añadir Nuevo Precio Especial' : 'Editar Precio Especial'}</h4>
            {commonFields}
            <div className="form-control w-full">
              <label className="label"><span className="label-text">ID Cliente</span></label>
              <input 
                type="text" 
                value={editingRuleData.clienteId || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, clienteId: e.target.value })}
                placeholder="ID Cliente" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">ID Producto</span></label>
              <input 
                type="text" 
                value={editingRuleData.productoId || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, productoId: e.target.value })}
                placeholder="ID Producto" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="form-control w-full">
              <label className="label"><span className="label-text">Precio Especial</span></label>
              <input 
                type="number" 
                value={editingRuleData.precio || ''} 
                onChange={(e) => setEditingRuleData({ ...editingRuleData, precio: parseFloat(e.target.value) })}
                placeholder="Precio Especial" 
                className="input input-bordered w-full" 
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={handleSave} className="btn btn-primary">Guardar</button>
              <button onClick={handleCancelEdit} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-base-100 rounded-lg shadow p-6">
      <div role="tablist" className="tabs tabs-lifted">
          <a role="tab" className={`tab ${activeTab === 'margins' ? 'tab-active' : ''}`} onClick={() => setActiveTab('margins')}>Márgenes</a>
          <a role="tab" className={`tab ${activeTab === 'discounts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('discounts')}>Descuentos</a>
          <a role="tab" className={`tab ${activeTab === 'specialPrices' ? 'tab-active' : ''}`} onClick={() => setActiveTab('specialPrices')}>Precios Especiales</a>
      </div>
      <div className="pt-6">
          <button onClick={handleAddNewClick} className="btn btn-primary mb-4">Añadir Nueva Regla</button>
          {editingRuleData && renderRuleForm()}

          <div className="mt-6 space-y-2">
            <h3 className="text-xl font-bold">Reglas Existentes</h3>
            {(stateMap[activeTab]?.data || []).map(rule => (
              <div key={rule.id} className="flex justify-between items-center p-2 border rounded-md">
                <span>{rule.descripcion || `Regla ${rule.id}`}</span>
                <div className="space-x-2">
                  <button onClick={() => handleEditClick(rule)} className="btn btn-outline btn-xs">Editar</button>
                  <button onClick={() => handleDelete(rule.id, activeTab)} className="btn btn-ghost btn-xs">Eliminar</button>
                </div>
              </div>
            ))}
            {(stateMap[activeTab]?.data || []).length === 0 && (
              <p className="text-base-content/70">No hay reglas definidas.</p>
            )}
          </div>
      </div>
    </div>
  );
}
