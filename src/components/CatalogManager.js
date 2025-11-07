'use client';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para gestionar CRUD de modelos simples (Material, Fabricante, Proveedor)
export default function CatalogManager({ title, endpoint, columns, initialForm }) {
  const [formData, setFormData] = useState(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  
  // Clave SWR para la mutación
  const cacheKey = endpoint;

  const { data: items, error: swrError, isLoading } = useSWR(cacheKey, fetcher);
  
  // Carga adicional de materiales para el selector en Tarifas
  const { data: materiales } = useSWR(title === 'Tarifas de Material' ? '/api/materiales' : null, fetcher);


  const openModal = (item = null) => {
    if (item) {
      const editData = {};
      Object.keys(initialForm).forEach(key => {
        editData[key] = item[key] || initialForm[key];
      });
      if (item.referencia) {
          editData.nombre = item.referencia;
      }
      setFormData({ ...editData, id: item.id });
    } else {
      setFormData(initialForm);
    }
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const isEdit = !!formData.id;
    const url = isEdit ? `${endpoint}/${formData.id}` : endpoint;
    const method = isEdit ? 'PUT' : 'POST';

    const dataToSend = { ...formData };
    if (endpoint.includes('referencias') && isEdit) {
        dataToSend.referencia = formData.nombre;
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar el ítem');
      }

      mutate(cacheKey);
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm(`¿Estás seguro de que quieres eliminar este ${title.slice(0, -1).toLowerCase()}?`)) {
      setError(null);
      try {
        const res = await fetch(`${endpoint}/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar el ítem. Puede tener elementos dependientes.');
        }
        mutate(cacheKey); 
      } catch (err) {
        alert(err.message); 
      }
    }
  };

  if (isLoading) return <span className="loading loading-spinner"></span>;
  if (swrError) return <div className="text-red-500">Error al cargar {title.toLowerCase()}.</div>;
  
  // Construye los campos del formulario
  const formFields = Object.keys(initialForm).map(key => ({
      name: key,
      label: columns.find(c => c.key === key)?.label || key.charAt(0).toUpperCase() + key.slice(1),
      type: (key.toLowerCase().includes('precio') || key.toLowerCase().includes('valor') || key.toLowerCase().includes('peso') || key.toLowerCase().includes('espesor') || key.toLowerCase().includes('ancho') || key.toLowerCase().includes('lonas')) ? 'number' : 'text',
      step: (key.toLowerCase().includes('precio') || key.toLowerCase().includes('valor') || key.toLowerCase().includes('peso') || key.toLowerCase().includes('espesor') || key.toLowerCase().includes('ancho') || key.toLowerCase().includes('lonas')) ? '0.01' : 'any',
      required: key === 'nombre' || key === 'material' || key === 'precio' || key === 'espesor' || key === 'peso',
  }));

  const getDisplayValue = (item, key) => {
    let displayValue = item[key];
    
    if (endpoint.includes('referencias') && key === 'nombre') {
        displayValue = item.referencia;
    }
    
    if (typeof displayValue === 'number' && key !== 'lonas') {
        displayValue = displayValue.toFixed(2);
    }
    return displayValue || 'N/A';
  }

  const renderFormFields = () => {
    const isTarifas = title === 'Tarifas de Material';

    return formFields.map(field => {
        if (isTarifas && field.name === 'material') {
            return (
                <select
                    key={field.name}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="select select-bordered w-full"
                    required
                >
                    <option value="">Selecciona Material</option>
                    {materiales?.map(m => (
                        <option key={m.id} value={m.nombre}>{m.nombre}</option>
                    ))}
                </select>
            );
        }
        
        // Renderizado estándar para el resto de campos
        return (
            <input 
              key={field.name}
              type={field.type}
              step={field.type === 'number' ? field.step : undefined}
              name={field.name} 
              value={formData[field.name] === null || formData[field.name] === undefined ? '' : formData[field.name]}
              onChange={handleChange} 
              placeholder={field.label} 
              className="input input-bordered w-full" 
              required={field.required}
            />
        );
    });
  };


  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Gestión de {title}</h2>
            <button onClick={() => openModal()} className="btn btn-primary btn-sm">
                <PlusCircle className="w-4 h-4" /> Nuevo
            </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table w-full table-compact">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* CORREGIDO: Usar Array.isArray(items) para asegurar que es iterable */}
              {Array.isArray(items) && items.map((item) => (
                <tr key={item.id} className="hover">
                  {columns.map(col => (
                      <td key={col.key}>{getDisplayValue(item, col.key)}</td>
                  ))}
                  <td className="flex gap-2">
                    <button onClick={() => openModal(item)} className="btn btn-sm btn-outline btn-info">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-sm btn-outline btn-error">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Crear/Editar */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{formData.id ? `Editar ${title.slice(0, -1)}` : `Nuevo ${title.slice(0, -1)}`}</h3>
            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              {renderFormFields()}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="modal-action">
                <button type="button" onClick={closeModal} className="btn">Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
            <button type="button" onClick={closeModal} className="btn btn-sm btn-circle absolute right-2 top-2"><X /></button>
          </div>
        </div>
      )}
    </div>
  );
}
