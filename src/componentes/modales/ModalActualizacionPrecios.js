"use client";
import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Save, X, CheckCircle } from 'lucide-react';

export default function BulkPriceUpdateModal({ isOpen, onClose, materiales = [], onSuccess }) {
    const [percentage, setPercentage] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState('TODOS');
    const [isLoading, setIsLoading] = useState(false);
    // FE-01: sustituir confirm/alert nativos por confirmación inline en el propio modal
    const [confirmando, setConfirmando] = useState(false);
    const [resultado, setResultado] = useState(null); // { ok, mensaje }

    if (!isOpen) return null;

    const handleSolicitarConfirmacion = (e) => {
        e.preventDefault();
        if (!percentage) return;
        setConfirmando(true);
        setResultado(null);
    };

    const handleConfirmar = async () => {
        setConfirmando(false);
        setIsLoading(true);
        setResultado(null);
        try {
            const res = await fetch('/api/precios/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    percentage: parseFloat(percentage),
                    material: selectedMaterial,
                }),
            });
            if (!res.ok) throw new Error('Error al actualizar');
            const data = await res.json();
            setResultado({ ok: true, mensaje: `Se actualizaron ${data.count} tarifas correctamente.` });
            if (onSuccess) onSuccess();
            setPercentage('');
            setSelectedMaterial('TODOS');
        } catch (error) {
            setResultado({ ok: false, mensaje: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelar = () => {
        setConfirmando(false);
    };

    const uniqueMaterialNames = [...new Set(materiales?.map(m => m.nombre) || [])].sort();

    return (
        <div className="modal modal-open z-[9999]">
            <div className="modal-box border-t-4 border-warning">
                <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" aria-label="Cerrar">
                    <X className="w-4 h-4" />
                </button>

                <h3 className="font-bold text-lg flex items-center gap-2">
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

                {/* Resultado tras guardar */}
                {resultado && (
                    <div className={`alert mt-3 text-sm ${resultado.ok ? 'alert-success' : 'alert-error'}`}>
                        {resultado.ok
                            ? <CheckCircle className="w-4 h-4 shrink-0" />
                            : <AlertTriangle className="w-4 h-4 shrink-0" />}
                        {resultado.mensaje}
                    </div>
                )}

                {/* Confirmación previa */}
                {confirmando && (
                    <div className="alert alert-error mt-4">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-bold">¿Confirmar cambio?</p>
                            <p className="text-sm mt-0.5">
                                {selectedMaterial === 'TODOS'
                                    ? `Se modificará TODA la tarifa un ${percentage}%. Esta acción es irreversible.`
                                    : `Se modificarán todos los precios de "${selectedMaterial}" un ${percentage}%.`}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn btn-sm btn-ghost" onClick={handleCancelar}>Cancelar</button>
                            <button className="btn btn-sm btn-error" onClick={handleConfirmar}>Confirmar</button>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSolicitarConfirmacion} className="mt-6 space-y-4">
                    <div className="form-control w-full">
                        <label className="label" htmlFor="bulk-material">
                            <span className="label-text font-bold">¿A qué productos aplicar?</span>
                        </label>
                        <select
                            id="bulk-material"
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

                    <div className="form-control w-full">
                        <label className="label" htmlFor="bulk-pct">
                            <span className="label-text font-bold">Porcentaje de Variación (%)</span>
                        </label>
                        <label className="input-group">
                            <input
                                id="bulk-pct"
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

                    {percentage && (
                        <div className="text-center py-2 text-sm opacity-70">
                            {parseFloat(percentage) > 0
                                ? `📈 Subir un ${percentage}% a: ${selectedMaterial}`
                                : `📉 Bajar un ${Math.abs(parseFloat(percentage))}% a: ${selectedMaterial}`}
                        </div>
                    )}

                    <div className="modal-action">
                        <button type="button" onClick={onClose} className="btn btn-ghost" disabled={isLoading}>Cancelar</button>
                        <button
                            type="submit"
                            className="btn btn-warning"
                            disabled={isLoading || !percentage || confirmando}
                        >
                            {isLoading
                                ? <span className="loading loading-spinner loading-sm" />
                                : <Save className="w-4 h-4" />}
                            Aplicar Cambio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
