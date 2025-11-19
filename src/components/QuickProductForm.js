// src/components/QuickProductForm.js
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Package, X, Save } from 'lucide-react';

// Este componente ahora recibe los catálogos como props para ser puramente presentacional y reutilizable
// Opcionalmente puede cargar sus propios datos si no se le pasan
export default function QuickProductForm({ 
    isOpen, 
    onClose, 
    onCreated, 
    catalogos, // { fabricantes, materiales, tarifas }
    productoAEditar = null // Opcional: Si se pasa, actúa como formulario de edición
}) {
    const { fabricantes, materiales, tarifas } = catalogos;
    
    // Estado inicial
    const initialFormState = { 
        id: null, nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
        precioUnitario: '', pesoUnitario: '', costo: '',
        fabricante: '', material: '' 
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Efecto para cargar datos si es edición
    useEffect(() => {
        if (isOpen) {
            if (productoAEditar) {
                 setFormData({ 
                    id: productoAEditar.id, 
                    nombre: productoAEditar.nombre, 
                    modelo: productoAEditar.referenciaFabricante || '', 
                    espesor: String(productoAEditar.espesor) || '', 
                    largo: productoAEditar.largo || '',     
                    ancho: productoAEditar.ancho || '',     
                    precioUnitario: productoAEditar.precioUnitario || '',     
                    pesoUnitario: productoAEditar.pesoUnitario || '',     
                    costo: productoAEditar.costoUnitario || '',           
                    fabricante: productoAEditar.fabricante?.nombre || '', 
                    material: productoAEditar.material?.nombre || ''
                });
            } else {
                setFormData(initialFormState);
            }
            setError(null);
        }
    }, [isOpen, productoAEditar]);

    // Lógica para obtener espesores disponibles según el material
    const availableEspesores = useMemo(() => {
        if (!tarifas || !formData.material) return [];
        
        const espesores = tarifas
            .filter(t => t.material === formData.material)
            .map(t => String(t.espesor));
        
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, formData.material]);

    // Resetear espesor si el material cambia (solo si el usuario está interactuando, no al cargar edición)
    const handleMaterialChange = (e) => {
        setFormData(prev => ({ ...prev, material: e.target.value, espesor: '' }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const url = formData.id ? `/api/productos/${formData.id}` : '/api/productos';
        const method = formData.id ? 'PUT' : 'POST';

        // La API de productos (POST /api/productos) recalcula precio/peso con estos datos
        const dataToSend = {
            ...formData,
            espesor: parseFloat(formData.espesor) || 0,
            largo: parseFloat(formData.largo) || 0,
            ancho: parseFloat(formData.ancho) || 0,
            precioUnitario: 0, // Se recalcula en backend
            pesoUnitario: 0,   // Se recalcula en backend
            costo: parseFloat(formData.costo) || 0,
        };
        
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error al guardar el producto';
                try {
                    const errData = JSON.parse(errorText);
                    errorMessage = errData.message || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }
            
            const savedProduct = await res.json();
            onCreated(savedProduct); // Callback para actualizar la lista padre
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <button type="button" onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X className="w-4 h-4"/></button>
            <h3 className="font-bold text-lg flex items-center mb-4">
                <Package className="mr-2" /> {formData.id ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campo de Nombre (Deshabilitado para autocompletado, igual que en gestión) */}
                <div className="form-control w-full md:col-span-2">
                    <label className="label"><span className="label-text">Nombre (Autogenerado)</span></label>
                    <input 
                        type="text" 
                        name="nombre" 
                        value={formData.nombre} 
                        onChange={handleChange} 
                        placeholder="Se generará automáticamente al guardar" 
                        className="input input-bordered w-full" 
                        disabled 
                    />
                </div>

                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Referencia Fabricante</span></label>
                    <input 
                        type="text" 
                        name="modelo" 
                        value={formData.modelo} 
                        onChange={handleChange} 
                        placeholder="Ej: REF-123" 
                        className="input input-bordered w-full" 
                        required 
                    />
                </div>
                
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Fabricante</span></label>
                    <select name="fabricante" value={formData.fabricante} onChange={handleChange} className="select select-bordered w-full" required>
                        <option value="">Selecciona Fabricante</option>
                        {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
                    </select>
                </div>
                
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Material</span></label>
                    <select name="material" value={formData.material} onChange={handleMaterialChange} className="select select-bordered w-full" required>
                        <option value="">Selecciona Material</option>
                        {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                    </select>
                </div>
                
                {/* Selector de Espesor Dinámico */}
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Espesor (mm)</span></label>
                    <select 
                        name="espesor" 
                        value={formData.espesor} 
                        onChange={handleChange} 
                        className="select select-bordered w-full" 
                        disabled={!formData.material || availableEspesores.length === 0}
                        required
                    >
                        <option value="">{formData.material ? (availableEspesores.length > 0 ? 'Selecciona Espesor' : 'Sin tarifas') : 'Selecciona Material'}</option>
                        {availableEspesores.map(e => (
                            <option key={e} value={e}>{e} mm</option>
                        ))}
                    </select>
                </div>
                
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Largo (mm)</span></label>
                    <input type="number" step="1" name="largo" value={formData.largo} onChange={handleChange} placeholder="0" className="input input-bordered w-full" required />
                </div>

                <div className="form-control w-full">
                     <label className="label"><span className="label-text">Ancho (mm)</span></label>
                    <input type="number" step="1" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="0" className="input input-bordered w-full" required />
                </div>

                {/* Campos ocultos necesarios para la API */}
                <input type="hidden" name="precioUnitario" value={formData.precioUnitario} />
                <input type="hidden" name="pesoUnitario" value={formData.pesoUnitario} />
                <input type="hidden" name="costo" value={formData.costo} />
                
                {error && <div className="alert alert-error md:col-span-2 text-sm">{error}</div>}
                
                <div className="modal-action md:col-span-2">
                    <button type="button" onClick={onClose} className="btn">Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4 mr-2" />}
                        {formData.id ? 'Guardar Cambios' : 'Crear Producto'}
                    </button>
                </div>
            </form>
          </div>
        </div>
    );
}