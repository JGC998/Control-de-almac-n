// src/components/QuickProductForm.js
"use client";
import React, { useState, useEffect } from 'react';
import { Package, X, Save } from 'lucide-react';

export default function QuickProductForm({
    isOpen,
    onClose,
    onCreated,
    productoAEditar = null
}) {
    // Estado inicial simplificado para el nuevo modelo
    const initialFormState = {
        nombre: '',
        descripcion: '',
        precio: '',
        stock: 0,
        categoria: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Efecto para cargar datos si es edición
    useEffect(() => {
        if (isOpen) {
            if (productoAEditar) {
                setFormData({
                    nombre: productoAEditar.nombre,
                    descripcion: productoAEditar.descripcion || '',
                    precio: productoAEditar.precio || '',
                    stock: productoAEditar.stock || 0,
                    categoria: productoAEditar.categoria || ''
                });
            } else {
                setFormData(initialFormState);
            }
            setError(null);
        }
    }, [isOpen, productoAEditar]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
        }));
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const url = productoAEditar ? `/api/productos/${productoAEditar.id}` : '/api/productos';
        const method = productoAEditar ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al guardar el producto');
            }

            const savedProduct = await res.json();
            if (onCreated) onCreated(savedProduct);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
                <button type="button" onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X className="w-4 h-4" /></button>
                <h3 className="font-bold text-lg flex items-center mb-4">
                    <Package className="mr-2" /> {productoAEditar ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>

                <form onSubmit={handleSubmit} className="py-4 flex flex-col gap-4">

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Nombre</span></label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            placeholder="Nombre del producto"
                            className="input input-bordered w-full"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control w-full">
                            <label className="label"><span className="label-text">Precio (€)</span></label>
                            <input
                                type="number"
                                name="precio"
                                step="0.01"
                                value={formData.precio}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="input input-bordered w-full"
                                required
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label"><span className="label-text">Stock</span></label>
                            <input
                                type="number"
                                name="stock"
                                step="1"
                                value={formData.stock}
                                onChange={handleChange}
                                placeholder="0"
                                className="input input-bordered w-full"
                            />
                        </div>
                    </div>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Categoría</span></label>
                        <input
                            type="text"
                            name="categoria"
                            value={formData.categoria}
                            onChange={handleChange}
                            placeholder="Ej: Goma, Fieltro"
                            className="input input-bordered w-full"
                        />
                    </div>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Descripción</span></label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={handleChange}
                            placeholder="Detalles adicionales..."
                            className="textarea textarea-bordered h-24"
                        ></textarea>
                    </div>

                    {error && <div className="alert alert-error text-sm">{error}</div>}

                    <div className="modal-action">
                        <button type="button" onClick={onClose} className="btn">Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4 mr-2" />}
                            {productoAEditar ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}