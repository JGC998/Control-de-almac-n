"use client";
import React, { useState, useEffect } from 'react';
import FormularioEntidad from '@/componentes/compuestos/FormularioEntidad';

const camposCliente = [
  { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
  {
    clave: 'categoria',
    etiqueta: 'Categoría',
    tipo: 'selector',
    opciones: ['FABRICANTE', 'INTERMEDIARIO', 'CLIENTE FINAL', 'NORMAL']
  },
  { clave: 'email', etiqueta: 'Email', tipo: 'email' },
  { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
  { clave: 'direccion', etiqueta: 'Dirección' },
];

const ClientEditModal = ({ cliente, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || '',
        categoria: cliente.categoria || 'NORMAL',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
        direccion: cliente.direccion || '',
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar el cliente');
      }

      const updatedCliente = await res.json();
      onUpdate(updatedCliente);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open bg-black/50 backdrop-blur-sm">
      <div className="modal-box w-11/12 max-w-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          disabled={loading}
        >
          ✕
        </button>

        <FormularioEntidad
          titulo={`Editar Cliente: ${cliente?.nombre}`}
          campos={camposCliente}
          valores={formData}
          alCambiar={handleChange}
          alEnviar={handleSubmit}
          alCancelar={onClose}
          cargando={loading}
          error={error}
          textoGuardar="Guardar Cambios"
        />
      </div>
      <div className="modal-backdrop" onClick={!loading ? onClose : undefined} />
    </div>
  );
};

export default ClientEditModal;
