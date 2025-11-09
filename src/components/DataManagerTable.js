"use client";
import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, Edit, Trash2, Save, X, RotateCw } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Helper para determinar el tipo de input basado en el tipo de dato
const getInputType = (dataType) => {
  switch (dataType) {
    case 'number':
    case 'float':
      return 'number';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
};

const DataManagerTable = ({ apiEndpoint, modelName, fields, idField = 'id' }) => {
  const { data, error, isLoading, mutate } = useSWR(apiEndpoint, fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [formState, setFormState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const handleOpenModal = (record = null) => {
    setCurrentRecord(record);
    // Inicializar el estado del formulario con los valores del registro o valores por defecto
    const initialFormState = fields.reduce((acc, field) => {
      acc[field.key] = record 
        ? record[field.key] 
        : (field.type === 'number' || field.type === 'float' ? 0 : (field.type === 'boolean' ? false : ''));
      return acc;
    }, {});
    setFormState(initialFormState);
    setFetchError(null);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;

    if (type === 'number') {
      // Manejar valores vacíos o no numéricos para evitar NaN, permitiendo el 0
      finalValue = value === '' ? null : (value.includes('.') ? parseFloat(value) : parseInt(value));
    } else if (type === 'checkbox') {
      finalValue = checked;
    }
    
    setFormState(prev => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFetchError(null);

    const isNew = !currentRecord;
    const method = isNew ? 'POST' : 'PUT';
    // Para PUT, enviamos el ID junto con los datos
    const body = isNew ? formState : { [idField]: currentRecord[idField], ...formState };

    try {
      const response = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Intentar usar el campo 'error' del servidor, sino usar mensaje genérico
        const errorMessage = errorData.error || `Error ${response.status}: No se pudo guardar el registro.`;
        throw new Error(errorMessage);
      }

      // Revalidar los datos en el caché y cerrar el modal
      mutate();
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Error saving record:', error);
      setFetchError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar este registro de ${modelName}? Esta acción es irreversible.`)) return;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [idField]: id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Error ${response.status}: No se pudo eliminar el registro.`;
        throw new Error(errorMessage);
      }

      mutate();
    } catch (error) {
      alert(`Error al eliminar: ${error.message}`);
      console.error('Error deleting record:', error);
    }
  }, [apiEndpoint, modelName, mutate, idField]);

  if (isLoading) return <div className="text-center p-8"><span className="loading loading-spinner loading-lg"></span></div>;
  
  // Mostrar error si la carga inicial falló
  if (error) return <div className="alert alert-error">Error al cargar datos: {error.message}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Gestión de {modelName} ({Array.isArray(data) ? data.length : 0})</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => handleOpenModal(null)}
        >
          <Plus className="w-5 h-5" /> Añadir Nuevo
        </button>
        <button 
          className="btn btn-ghost" 
          onClick={() => mutate()}
        >
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table w-full table-zebra">
          <thead><tr>
            {fields.map(field => (
              <th key={field.key} className="text-center">{field.label}</th>
            ))}
            <th className="text-center">Acciones</th>
          </tr></thead>
          <tbody>
            {/* CORRECCIÓN: Mapeo compacto para eliminar nodos de texto */}
            {Array.isArray(data) && data.map(record => (
              <tr key={record[idField]}>
                {fields.map(field => (
                  <td key={field.key} className="text-center">
                    {field.type === 'boolean' 
                      ? (record[field.key] ? '✅ Sí' : '❌ No') 
                      : (field.type === 'float' 
                        ? (record[field.key] !== null && record[field.key] !== undefined ? parseFloat(record[field.key]).toFixed(2) : 'N/A')
                        : record[field.key])}
                  </td>
                ))}
                <td className="flex justify-center space-x-2">
                  <button 
                    className="btn btn-ghost btn-xs btn-circle" 
                    onClick={() => handleOpenModal(record)}
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs btn-circle text-error" 
                    onClick={() => handleDelete(record[idField])}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {Array.isArray(data) && data.length === 0 && (
                <tr><td colSpan={fields.length + 1} className="text-center text-gray-500">No hay registros para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición/Creación */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {currentRecord ? `Editar ${modelName}: ID ${currentRecord[idField]}` : `Añadir Nuevo ${modelName}`}
            </h3>
            
            {fetchError && <div role="alert" className="alert alert-error mt-4">{fetchError}</div>}

            <form onSubmit={handleSave} className="py-4 space-y-4">
              {fields.map(field => (
                <label key={field.key} className="form-control w-full">
                  <div className="label"><span className="label-text">{field.label}</span></div>
                  {field.type === 'boolean' ? (
                    <input 
                      type="checkbox"
                      name={field.key}
                      className="checkbox checkbox-primary"
                      checked={!!formState[field.key]}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <input
                      type={getInputType(field.type)}
                      name={field.key}
                      placeholder={field.label}
                      className="input input-bordered w-full"
                      value={formState[field.key] === null ? '' : formState[field.key]}
                      onChange={handleChange}
                      // Permite decimales en flotantes y enteros en 'number'
                      step={field.type === 'float' ? '0.01' : (field.type === 'number' ? '1' : undefined)} 
                      required // Todos los campos son requeridos para la configuración
                      disabled={isSubmitting}
                    />
                  )}
                </label>
              ))}

              <div className="modal-action">
                <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-5 h-5" />}
                  {currentRecord ? 'Guardar Cambios' : 'Crear'}
                </button>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  <X className="w-5 h-5" /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagerTable;
