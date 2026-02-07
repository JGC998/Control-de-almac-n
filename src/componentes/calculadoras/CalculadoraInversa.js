"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import { Calculator, DollarSign, ArrowDown, Info } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function CalculadoraInversa() {
    const [targetPrice, setTargetPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedMarginId, setSelectedMarginId] = useState('');
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);

    const handleCalcular = async () => {
        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            const res = await fetch('/api/pricing/inverse-calc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetPrice: parseFloat(targetPrice),
                    quantity: parseInt(quantity),
                    marginId: selectedMarginId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Error al calcular');
            } else {
                setResultado(data);
            }
        } catch (err) {
            setError('Error de conexión');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isValid = targetPrice && quantity && parseFloat(targetPrice) > 0 && parseInt(quantity) > 0 && selectedMarginId;

    return (
        <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
            <div className="card-body">
                <h2 className="card-title text-primary flex items-center gap-2 mb-4">
                    <Calculator className="w-6 h-6" />
                    Calculadora Inversa de Márgenes
                </h2>

                <p className="text-sm text-gray-500 mb-6">
                    Calcula el coste máximo permitido para un producto dado un precio de venta objetivo y una regla de margen.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Precio Objetivo */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold flex items-center gap-1">
                                <DollarSign size={14} /> Precio Venta Objetivo (€)
                            </span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder="Ej: 100.00"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* Cantidad */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">Cantidad (Uds)</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ej: 1"
                            min="1"
                            step="1"
                        />
                    </div>
                </div>

                {/* Regla de Margen */}
                <div className="form-control mt-4">
                    <label className="label">
                        <span className="label-text font-semibold">Regla de Margen a Aplicar</span>
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={selectedMarginId}
                        onChange={(e) => setSelectedMarginId(e.target.value)}
                        disabled={margenesLoading}
                    >
                        <option value="">Selecciona una regla...</option>
                        {margenes?.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.descripcion} (x{m.multiplicador}{m.gastoFijo > 0 ? ` + ${m.gastoFijo}€ fijos` : ''})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Botón Calcular */}
                <button
                    className="btn btn-primary w-full mt-6"
                    onClick={handleCalcular}
                    disabled={!isValid || loading}
                >
                    {loading ? <span className="loading loading-spinner"></span> : 'Calcular Coste Máximo'}
                </button>

                {error && (
                    <div className="alert alert-error mt-4 shadow-sm">
                        <Info className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Resultados */}
                {resultado && (
                    <div className="mt-8 bg-base-200 p-6 rounded-xl border border-base-300 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <div className="text-sm font-medium text-gray-500 mb-1">COSTE MÁXIMO UNITARIO PERMITIDO</div>
                            <div className="text-4xl font-black text-success tracking-tight">
                                {resultado.maxCost.toFixed(2)} €
                            </div>
                        </div>

                        <div className="divider">DESGLOSE</div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Precio Venta Objetivo:</span>
                                <span className="font-semibold">{parseFloat(targetPrice).toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Margen ({resultado.breakdown.marginName}):</span>
                                <span className="font-semibold">÷ {resultado.breakdown.marginMultiplier}</span>
                            </div>
                            {resultado.breakdown.fixedCostPerUnit > 0 && (
                                <div className="flex justify-between text-warning">
                                    <span className="flex items-center gap-1">
                                        Gastos Fijos Unitarios:
                                    </span>
                                    <span className="font-semibold">- {resultado.breakdown.fixedCostPerUnit.toFixed(4)} €</span>
                                </div>
                            )}

                            <div className="bg-base-100 p-3 rounded-lg mt-4 text-xs font-mono text-gray-500 break-all border border-base-300">
                                Fórmula: {resultado.breakdown.formula} = Coste
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
