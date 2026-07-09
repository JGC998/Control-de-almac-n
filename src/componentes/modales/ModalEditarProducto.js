"use client";
import React from 'react';
import FormularioProductoInteligente from '@/componentes/productos/FormularioProductoInteligente';

const ModalEditarProducto = ({ producto, isOpen, onClose, onUpdate }) => {
    if (!isOpen || !producto) return null;

    return (
        <div className="modal modal-open bg-black/50 backdrop-blur-sm">
            <div className="modal-box w-11/12 max-w-2xl relative">
                <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                >
                    ✕
                </button>
                <h3 className="font-bold text-lg mb-4">Editar: {producto.nombre}</h3>
                <FormularioProductoInteligente
                    productoAEditar={producto}
                    onGuardado={(updated) => { onUpdate(updated); onClose(); }}
                    onCancelar={onClose}
                />
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
};

export default ModalEditarProducto;
