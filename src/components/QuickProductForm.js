"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Package, Plus, X } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

// --- COMPONENTE DE MODAL DE CREACIÓN RÁPIDA (REUSABLE) ---
export default function QuickProductForm({ isOpen, onClose, onCreated, catalogos }) {
    const { fabricantes, materiales, tarifas } = catalogos;
    
    // Estado inicial que refleja los inputs necesarios para POST /api/productos
    const [formData, setFormData] = useState({ 
        nombre: '', modelo: '', espesor: '', largo: '', ancho: '', 
        material: '', fabricante: ''
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Lógica para obtener espesores disponibles según el material
    const availableEspesores = useMemo(() => {
        if (!tarifas || !formData.material) return [];
        
        const espesores = tarifas
            .filter(t => t.material === formData.material)
            .map(t => String(t.espesor));
        
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, formData.material]);

    // Resetear espesor si el material cambia
    useEffect(() => {
        setFormData(prev => ({ ...prev, espesor: '' }));
    }, [formData.material]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        // La API de productos (POST /api/productos) recalcula precio/peso con estos datos
        const dataToSend = {
            ...formData,
            espesor: parseFloat(formData.espesor) || 0,
            largo: parseFloat(formData.largo) || 0,
            ancho: parseFloat(formData.ancho) || 0,
            precioUnitario: 0, // Se envían como 0, la API los calcula
            pesoUnitario: 0,
            costo: 0,
        };
        
        try {
            const res = await fetch('/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (!res.ok) {
                const errorText = await res.text();
                let errorMessage = 'Error al crear el producto';
                try {
                    const errData = JSON.parse(errorText);
                    errorMessage = errData.message || errorMessage;
                } catch {}
                throw new Error(errorMessage);
            }
            
            const newProduct = await res.json();
            onCreated(newProduct); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <button type="button" onClick={onClose} className="btn btn-sm btn-circle absolute right-2 top-2"><X /></button>
            <h3 className="font-bold text-lg flex items-center mb-4">
                <Package className="mr-2" /> Nueva Plantilla de Producto Rápido
            </h3>
            <form onSubmit={handleSubmit} className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre/Descripción" className="input input-bordered w-full md:col-span-2" required />
                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} placeholder="Referencia Fabricante" className="input input-bordered w-full" required />
                
                <select name="fabricante" value={formData.fabricante} onChange={handleChange} className="select select-bordered w-full" required>
                    <option value="">Selecciona Fabricante</option>
                    {fabricantes?.map(f => <option key={f.id} value={f.nombre}>{f.nombre}</option>)}
                </select>
                
                <select name="material" value={formData.material} onChange={handleChange} className="select select-bordered w-full" required>
                    <option value="">Selecciona Material</option>
                    {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
                
                {/* Selector de Espesor Dinámico */}
                <label className="form-control w-full">
                    <div className="label"><span className="label-text">Espesor (mm)</span></div>
                    <select 
                        name="espesor" 
                        value={formData.espesor} 
                        onChange={handleChange} 
                        className="select select-bordered w-full" 
                        disabled={!formData.material || availableEspesores.length === 0}
                        required
                    >
                        <option value="">{formData.material ? (availableEspesores.length > 0 ? 'Selecciona Espesor' : 'Sin tarifas para este material') : 'Selecciona Material primero'}</option>
                        {availableEspesores.map(e => (
                            <option key={e} value={e}>{e} mm</option>
                        ))}
                    </select>
                </label>
                
                <input type="number" step="1" name="largo" value={formData.largo} onChange={handleChange} placeholder="Largo (mm)" className="input input-bordered w-full" required />
                <input type="number" step="1" name="ancho" value={formData.ancho} onChange={handleChange} placeholder="Ancho (mm)" className="input input-bordered w-full" required />
                
                {error && <p className="text-error text-sm md:col-span-2">{error}</p>}
                
                <div className="modal-action md:col-span-2">
                    <button type="button" onClick={onClose} className="btn">Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
          </div>
        </div>
    );
}
