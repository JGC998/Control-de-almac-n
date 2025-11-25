// src/components/ClientEditModal.js
import React from 'react';

const ClientEditModal = ({ cliente, isOpen, onClose, onUpdate }) => {
  if (!isOpen) {
    return null;
  }

  const handleUpdate = () => {
    // Lógica para actualizar el cliente
    // Por ahora, solo cerramos el modal y llamamos a onUpdate
    onUpdate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h2 className="text-lg font-bold mb-4">Editar Cliente</h2>
        <p>Aquí iría el formulario para editar los datos de:</p>
        <p className="font-semibold">{cliente?.nombre}</p>
        {/* Placeholder for form fields */}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancelar
          </button>
          <button onClick={handleUpdate} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientEditModal;
