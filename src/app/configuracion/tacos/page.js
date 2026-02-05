"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Save, RefreshCw, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/utils';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TacosAdminPage() {
    const { data: tacos, error, isLoading } = useSWR('/api/tacos', fetcher);
    const [editedPrices, setEditedPrices] = useState({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const handlePriceChange = (tacoId, newPrice) => {
        setEditedPrices(prev => ({
            ...prev,
            [tacoId]: parseFloat(newPrice) || 0
        }));
    };

    const handleSave = async () => {
        if (Object.keys(editedPrices).length === 0) {
            setMessage({ type: 'warning', text: 'No hay cambios para guardar' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const updates = Object.entries(editedPrices).map(([id, precio]) => ({
                id: parseInt(id),
                precioMetro: precio
            }));

            const response = await fetch('/api/tacos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });

            if (!response.ok) throw new Error('Error al guardar');

            setMessage({ type: 'success', text: `✅ ${updates.length} precios actualizados correctamente` });
            setEditedPrices({});
            mutate('/api/tacos');
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error al guardar los cambios' });
            console.error('Error:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setEditedPrices({});
        setMessage(null);
    };

    const getCurrentPrice = (taco) => {
        return editedPrices[taco.id] !== undefined
            ? editedPrices[taco.id]
            : taco.precioMetro;
    };

    const hasChanges = Object.keys(editedPrices).length > 0;

    // Agrupar tacos por tipo
    const tacosRectos = tacos?.filter(t => t.tipo === 'RECTO') || [];
    const tacosInclinados = tacos?.filter(t => t.tipo === 'INCLINADO') || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-error">
                <AlertCircle className="w-5 h-5" />
                <span>Error al cargar los tacos</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Tacos</h1>
                    <p className="text-base-content/70 mt-1">
                        Configura los precios por metro lineal de cada tipo de taco
                    </p>
                </div>

                <div className="flex gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="btn btn-ghost gap-2"
                            disabled={saving}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Descartar
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="btn btn-primary gap-2"
                        disabled={!hasChanges || saving}
                    >
                        {saving ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`alert alert-${message.type} mb-4`}>
                    <span>{message.text}</span>
                </div>
            )}

            {/* Stats */}
            <div className="stats shadow mb-6 w-full">
                <div className="stat">
                    <div className="stat-title">Total Tacos</div>
                    <div className="stat-value">{tacos?.length || 0}</div>
                    <div className="stat-desc">Referencias activas</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Cambios Pendientes</div>
                    <div className="stat-value text-primary">{Object.keys(editedPrices).length}</div>
                    <div className="stat-desc">Sin guardar</div>
                </div>
            </div>

            {/* Tacos Rectos */}
            <div className="card bg-base-100 shadow-xl mb-6">
                <div className="card-body">
                    <h2 className="card-title text-2xl mb-4">
                        <span className="badge badge-primary">RECTOS</span>
                        {tacosRectos.length} referencias
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Altura</th>
                                    <th>Precio / Metro</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tacosRectos.map(taco => (
                                    <tr key={taco.id} className={editedPrices[taco.id] !== undefined ? 'bg-warning/10' : ''}>
                                        <td>
                                            <div className="font-bold">{taco.altura}mm</div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={getCurrentPrice(taco)}
                                                    onChange={(e) => handlePriceChange(taco.id, e.target.value)}
                                                    className="input input-bordered input-sm w-32"
                                                />
                                                <span className="text-base-content/70">€/m</span>
                                                {editedPrices[taco.id] !== undefined && (
                                                    <span className="badge badge-warning badge-sm">Modificado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${taco.activo ? 'badge-success' : 'badge-error'}`}>
                                                {taco.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tacos Inclinados */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title text-2xl mb-4">
                        <span className="badge badge-secondary">INCLINADOS</span>
                        {tacosInclinados.length} referencias
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Altura</th>
                                    <th>Precio / Metro</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tacosInclinados.map(taco => (
                                    <tr key={taco.id} className={editedPrices[taco.id] !== undefined ? 'bg-warning/10' : ''}>
                                        <td>
                                            <div className="font-bold">{taco.altura}mm</div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={getCurrentPrice(taco)}
                                                    onChange={(e) => handlePriceChange(taco.id, e.target.value)}
                                                    className="input input-bordered input-sm w-32"
                                                />
                                                <span className="text-base-content/70">€/m</span>
                                                {editedPrices[taco.id] !== undefined && (
                                                    <span className="badge badge-warning badge-sm">Modificado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${taco.activo ? 'badge-success' : 'badge-error'}`}>
                                                {taco.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="alert alert-info mt-6">
                <AlertCircle className="w-5 h-5" />
                <div>
                    <p className="font-bold">Información sobre precios</p>
                    <p className="text-sm">
                        Los precios se expresan en euros por metro lineal. El cálculo final dependerá
                        del ancho de la banda y la cantidad de tacos configurados.
                    </p>
                </div>
            </div>
        </div>
    );
}
