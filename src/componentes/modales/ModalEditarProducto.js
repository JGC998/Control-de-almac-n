"use client";
import React, { useState, useEffect } from 'react';
import FormularioEntidad from '@/componentes/compuestos/FormularioEntidad';

const camposProducto = [
    { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
    {
        clave: 'precioUnitario',
        etiqueta: 'Precio unitario (€)',
        tipo: 'numero',
        requerido: true,
        min: 0,
        step: '0.01'
    },
    {
        clave: 'costoUnitario',
        etiqueta: 'Costo unitario (€)',
        tipo: 'numero',
        min: 0,
        step: '0.01'
    },
    {
        clave: 'pesoUnitario',
        etiqueta: 'Peso unitario (kg)',
        tipo: 'numero',
        min: 0,
        step: '0.001'
    },
    { clave: 'color', etiqueta: 'Color', placeholder: 'Ej: VERDE, NEGRO...' },
    { clave: 'referenciaFabricante', etiqueta: 'Referencia fabricante' },
];

const ModalEditarProducto = ({ producto, isOpen, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (producto) {
            setFormData({
                nombre: producto.nombre || '',
                precioUnitario: producto.precioUnitario ?? 0,
                costoUnitario: producto.costoUnitario ?? 0,
                pesoUnitario: producto.pesoUnitario ?? 0,
                color: producto.color || '',
                referenciaFabricante: producto.referenciaFabricante || '',
            });
        }
    }, [producto]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/productos/${producto.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    precioUnitario: parseFloat(formData.precioUnitario),
                    costoUnitario: formData.costoUnitario ? parseFloat(formData.costoUnitario) : undefined,
                    pesoUnitario: parseFloat(formData.pesoUnitario),
                }),
            });

            if (!res.ok) {
                throw new Error('Error al actualizar el producto');
            }

            const updatedProducto = await res.json();
            onUpdate(updatedProducto);
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
                    titulo={`Editar Producto: ${producto?.nombre}`}
                    campos={camposProducto}
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

export default ModalEditarProducto;
