"use client";
import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Save, X } from 'lucide-react';

export default function BulkPriceUpdateModal({ isOpen, onClose, materiales = [], onSuccess }) {
    const [percentage, setPercentage] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState('TODOS');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!percentage) return;

        // 1. Advertencia de Seguridad (Alert del navegador)
        const mensajeAdvertencia = selectedMaterial === 'TODOS'
            ? `⚠️ ¡ATENCIÓN!\n\nVas a modificar el precio de TODAS las tarifas un ${percentage}%.\n\nEsta acción afectará a todos los presupuestos nuevos.\n¿Estás absolutamente seguro?`
            : `⚠️ Confirmación\n\nVas a modificar el precio de todas las referencias de "${selectedMaterial}" un ${percentage}%.\n\n¿Confirmar cambio?`;

        if (!confirm(mensajeAdvertencia)) {
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/precios/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    percentage: parseFloat(percentage), 
                    material: selectedMaterial 
                }),
            });

            if (!res.ok) throw new Error('Error al actualizar');

            const data = await res.json();
            alert(`✅ Operación exitosa: Se actualizaron ${data.count} tarifas.`);
            
            if (onSuccess) onSuccess();
            onClose();
            setPercentage('');
            setSelectedMaterial('TODOS');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Lista única de nombres de materiales para el desplegable
    const uniqueMaterialNames = [...new Set(materiales?.map(m => m.nombre) || [])].sort();

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box border-t-4 border-warning">
                <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    <X className="w-4 h-4" />
                </button>
                
                <h3 className="font-bold text-lg flex items-center gap-2 text-warning-content">
                    <TrendingUp className="w-6 h-6 text-warning" />
                    Actualización Masiva de Precios
                </h3>

                <div className="alert alert-warning bg-warning/10 text-xs mt-4">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                        Esta herramienta modifica directamente la base de datos de tarifas. 
                        Usa valores negativos (ej: -10) para bajar precios.
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    
                    {/* Selector de Material */}
                    <div className="form-control w-full">
                        <label className="label"><span className="label-text font-bold">¿A qué productos aplicar?</span></label>
                        <select 
                            className="select select-bordered w-full"
                            value={selectedMaterial}
                            onChange={(e) => setSelectedMaterial(e.target.value)}
                        >
                            <option value="TODOS" className="font-bold">⚡ APLICAR A TODA LA TARIFA (TODOS)</option>
                            <option disabled>----------------</option>
                            {uniqueMaterialNames.map(mat => (
                                <option key={mat} value={mat}>{mat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Input de Porcentaje */}
                    <div className="form-control w-full">
                        <label className="label"><span className="label-text font-bold">Porcentaje de Variación (%)</span></label>
                        <label className="input-group">
                            <input 
                                type="number" 
                                step="0.01" 
                                placeholder="Ej: 10 para subir, -5 para bajar" 
                                className="input input-bordered w-full font-mono text-lg" 
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                autoFocus
                                required
                            />
                            <span>%</span>
                        </label>
                    </div>

                    {/* Resumen Visual */}
                    {percentage && (
                        <div className="text-center py-2 text-sm opacity-70">
                            {parseFloat(percentage) > 0 
                                ? `📈 Subir un ${percentage}% a: ${selectedMaterial}` 
                                : `📉 Bajar un ${Math.abs(parseFloat(percentage))}% a: ${selectedMaterial}`
                            }
                        </div>
                    )}

                    <div className="modal-action">
                        <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
                        <button type="submit" className="btn btn-warning" disabled={isLoading || !percentage}>
                            {isLoading ? <span className="loading loading-spinner"></span> : <Save className="w-4 h-4" />}
                            Aplicar Cambio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}