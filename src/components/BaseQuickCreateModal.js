"use client";
import React, { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { X } from 'lucide-react'; 

// Componente para simplificar los campos del formulario
const InputField = ({ name, label, value, onChange, type = 'text', step = 'any', required = true, placeholder }) => (
    <div className="form-control">
        <label className="label"><span className="label-text">{label}</span></label>
        <input 
            name={name} 
            type={type} 
            value={value || ''} 
            onChange={onChange} 
            className="input input-bordered w-full" 
            step={step}
            required={required}
            placeholder={placeholder}
        />
    </div>
);

// --- Componente Modal para creación rápida (Unificado) ---
export const BaseQuickCreateModal = ({ isOpen, onClose, onCreated, title, endpoint, fields, cacheKey }) => {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
        setFormData(fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {}));
        setError(null);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Error al crear ${title}`);
      }
      const newItem = await res.json();
      mutate(cacheKey);
      onCreated(newItem); 
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Nuevo {title} Rápido</h3>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {fields.map(field => (
            <InputField 
              key={field.name}
              name={field.name}
              label={field.name.charAt(0).toUpperCase() + field.name.slice(1)} 
              placeholder={field.placeholder} 
              type={field.type}
              required={field.required}
              value={formData[field.name] || ''} 
              onChange={handleChange} 
            />
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn">Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};
