"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import { Package, Truck, Calculator, Info, Settings } from 'lucide-react';


export default function CalculadoraLogistica({ onAddToOrder }) {
    const [provincia, setProvincia] = useState('');
    const [provinciaInput, setProvinciaInput] = useState('');
    const [showProvincias, setShowProvincias] = useState(false);
    const [peso, setPeso] = useState('');
    const [altura, setAltura] = useState('');
    const [tipoPale, setTipoPale] = useState('EUROPEO');
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { data: tarifas, isLoading: tarifasLoading } = useSWR('/api/logistica/tarifas');

    const provincias = tarifas?.map(t => t.provincia).sort() || [];

    // Filtrar provincias basado en el input
    const provinciasFiltradas = provincias.filter(p =>
        p.toLowerCase().includes(provinciaInput.toLowerCase())
    );

    const handleSelectProvincia = (prov) => {
        setProvincia(prov);
        setProvinciaInput(prov);
        setShowProvincias(false);
    };

    const handleCalcular = async () => {
        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            const res = await fetch('/api/logistica/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provincia,
                    peso: parseFloat(peso),
                    altura: parseFloat(altura),
                    tipoPale
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Error al calcular');
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

    const isValid = provincia && peso && altura && parseFloat(peso) > 0 && parseFloat(altura) > 0;

    // Mapeo de tipologías a nombres legibles
    const tipologiaLabels = {
        parcel: 'PARCEL',
        miniQuarter: 'MINI QUARTER',
        quarter: 'QUARTER',
        miniLight: 'MINI LIGHT',
        half: 'HALF',
        light: 'LIGHT',
        megaLight: 'MEGA LIGHT',
        full: 'FULL',
        megaFull: 'MEGA FULL'
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-primary flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Calculadora de Costes Logísticos
                </h2>

                {tarifasLoading && (
                    <div className="flex justify-center py-4">
                        <span className="loading loading-spinner loading-md"></span>
                    </div>
                )}

                {!tarifasLoading && (
                    <>
                        {/* Tipo de Palé */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Tipo de Palé</span>
                            </label>
                            <div className="join w-full grid grid-cols-2">
                                <input
                                    className="join-item btn btn-sm"
                                    type="radio"
                                    name="tipoPale"
                                    aria-label="Europeo (120x80cm)"
                                    checked={tipoPale === 'EUROPEO'}
                                    onChange={() => setTipoPale('EUROPEO')}
                                />
                                <input
                                    className="join-item btn btn-sm"
                                    type="radio"
                                    name="tipoPale"
                                    aria-label="Medio Palé (60x80cm)"
                                    checked={tipoPale === 'MEDIO'}
                                    onChange={() => setTipoPale('MEDIO')}
                                />
                            </div>
                        </div>

                        {/* Provincia con Autocomplete */}
                        <div className="form-control mt-2">
                            <label className="label">
                                <span className="label-text">Provincia Destino</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={provinciaInput}
                                    onChange={(e) => {
                                        setProvinciaInput(e.target.value);
                                        setProvincia('');
                                        setShowProvincias(true);
                                    }}
                                    onFocus={() => setShowProvincias(true)}
                                    placeholder="Escribe para buscar..."
                                />
                                {showProvincias && provinciaInput && provinciasFiltradas.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {provinciasFiltradas.slice(0, 20).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                className="w-full text-left px-4 py-2 hover:bg-base-200 transition-colors"
                                                onClick={() => handleSelectProvincia(p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        {provinciasFiltradas.length > 20 && (
                                            <div className="px-4 py-2 text-sm text-gray-500 italic">
                                                +{provinciasFiltradas.length - 20} más... Sigue escribiendo para filtrar
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {provincia && (
                                <label className="label">
                                    <span className="label-text-alt text-success">✓ {provincia}</span>
                                </label>
                            )}
                        </div>

                        {/* Peso y Altura */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Peso (kg)</span>
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered"
                                    value={peso}
                                    onChange={(e) => setPeso(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="0.1"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Altura (cm)</span>
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered"
                                    value={altura}
                                    onChange={(e) => setAltura(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    step="1"
                                />
                            </div>
                        </div>

                        {/* Botón Calcular */}
                        <button
                            className="btn btn-primary mt-4"
                            onClick={handleCalcular}
                            disabled={!isValid || loading}
                        >
                            <Calculator className="w-4 h-4" />
                            {loading ? 'Calculando...' : 'Calcular Coste'}
                        </button>

                        {/* Error */}
                        {error && (
                            <div className="alert alert-error mt-4">
                                <Info className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Resultado */}
                        {resultado && !error && (
                            <div className="mt-4 p-4 bg-base-200 rounded-lg border border-base-300">
                                <div className="space-y-2">
                                    {/* Paletizado */}
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span className="flex items-center gap-1">
                                            <Package className="w-4 h-4" />
                                            Paletizado ({tipoPale}):
                                        </span>
                                        <span className="text-primary">{resultado.costePaletizado.toFixed(2)} €</span>
                                    </div>

                                    <div className="flex justify-between text-xs opacity-70 pl-6">
                                        <span>• Palé base:</span>
                                        <span>{resultado.desglose.pale.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-70 pl-6">
                                        <span>• Materiales (film, fleje, precinto):</span>
                                        <span>{resultado.desglose.materiales.toFixed(2)} €</span>
                                    </div>

                                    <div className="divider my-2"></div>

                                    {/* Transporte */}
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span className="flex items-center gap-1">
                                            <Truck className="w-4 h-4" />
                                            Transporte:
                                        </span>
                                        <span className="text-accent">{resultado.costeTransporte.toFixed(2)} €</span>
                                    </div>

                                    <div className="flex justify-between text-xs opacity-70 pl-6">
                                        <span>• Tipología:</span>
                                        <span className="badge badge-sm badge-outline">
                                            {tipologiaLabels[resultado.tipologia] || resultado.tipologia}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs opacity-70 pl-6">
                                        <span>• Destino:</span>
                                        <span>{resultado.provincia}</span>
                                    </div>

                                    <div className="divider my-2"></div>

                                    {/* Total */}
                                    <div className="flex justify-between text-lg font-bold text-success">
                                        <span>COSTE TOTAL:</span>
                                        <span>{resultado.costeTotal.toFixed(2)} €</span>
                                    </div>

                                    {/* Info adicional */}
                                    <div className="alert alert-info mt-3 py-2">
                                        <Info className="w-4 h-4" />
                                        <div className="text-xs">
                                            <p>Cálculo basado en: {resultado.parametros.peso}kg, {resultado.parametros.altura}cm</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Botón añadir al pedido (opcional) */}
                                {onAddToOrder && (
                                    <button
                                        className="btn btn-success btn-sm w-full mt-4"
                                        onClick={() => onAddToOrder({
                                            descripcion: `Envío ${tipoPale} a ${provincia}`,
                                            quantity: 1,
                                            unitPrice: resultado.costeTotal,
                                            detalles: `${peso}kg, ${altura}cm - ${tipologiaLabels[resultado.tipologia]}`
                                        })}
                                    >
                                        <Package className="w-4 h-4" />
                                        Añadir al Pedido
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
