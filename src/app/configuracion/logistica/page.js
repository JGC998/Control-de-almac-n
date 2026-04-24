"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Settings, Save, Package, Truck, AlertCircle, CheckCircle, Download } from 'lucide-react';
import Link from 'next/link';


function ConfigPaletizadoForm({ config, onSave }) {
    const [formData, setFormData] = useState(config);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        try {
            const res = await fetch('/api/logistica/config-paletizado', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSuccess(true);
                mutate('/api/logistica/config-paletizado');
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const total = formData.costePale + formData.costeFilm + formData.costeFleje + formData.costePrecinto;

    return (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h3 className="card-title text-lg">
                    <Package className="w-5 h-5" />
                    {formData.tipo === 'EUROPEO' ? 'Palé Europeo (120x80cm)' : 'Medio Palé (60x80cm)'}
                </h3>

                <div className="space-y-3 mt-2">
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text font-semibold">Coste Palé Base</span>
                        </label>
                        <div className="join w-full">
                            <input
                                type="number"
                                step="0.01"
                                className="input input-bordered join-item w-full"
                                value={formData.costePale}
                                onChange={(e) => handleChange('costePale', e.target.value)}
                            />
                            <span className="btn btn-sm join-item no-animation bg-base-200 border-base-300 pointer-events-none">€</span>
                        </div>
                    </div>

                    <div className="divider my-1 text-xs">Materiales Consumibles</div>

                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">Film (10% de rollo 5.38€)</span>
                        </label>
                        <div className="join w-full">
                            <input
                                type="number"
                                step="0.001"
                                className="input input-sm input-bordered join-item w-full"
                                value={formData.costeFilm}
                                onChange={(e) => handleChange('costeFilm', e.target.value)}
                            />
                            <span className="btn btn-xs join-item no-animation bg-base-200 border-base-300 pointer-events-none">€</span>
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">Fleje (0.3% de bobina 61€)</span>
                        </label>
                        <div className="join w-full">
                            <input
                                type="number"
                                step="0.001"
                                className="input input-sm input-bordered join-item w-full"
                                value={formData.costeFleje}
                                onChange={(e) => handleChange('costeFleje', e.target.value)}
                            />
                            <span className="btn btn-xs join-item no-animation bg-base-200 border-base-300 pointer-events-none">€</span>
                        </div>
                    </div>

                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text text-sm">Precinto (1% de rollo 1.47€)</span>
                        </label>
                        <div className="join w-full">
                            <input
                                type="number"
                                step="0.0001"
                                className="input input-sm input-bordered join-item w-full"
                                value={formData.costePrecinto}
                                onChange={(e) => handleChange('costePrecinto', e.target.value)}
                            />
                            <span className="btn btn-xs join-item no-animation bg-base-200 border-base-300 pointer-events-none">€</span>
                        </div>
                    </div>

                    <div className="divider my-1"></div>

                    <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="font-bold">Coste Total Paletizado:</span>
                        <span className="text-xl font-black text-primary">{total.toFixed(2)} €</span>
                    </div>
                </div>

                <div className="card-actions justify-end mt-4">
                    {success && (
                        <div className="alert alert-success py-2 px-3 flex-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Guardado correctamente</span>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        <Save className="w-4 h-4" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </form>
    );
}

function TablaTarifas({ tarifas }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const filteredTarifas = tarifas?.filter(t =>
        t.provincia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.codigoPostal.includes(searchTerm)
    ) || [];

    const handleEdit = (tarifa) => {
        setEditingId(tarifa.id);
        setEditData(tarifa);
    };

    const handleSave = async () => {
        try {
            const res = await fetch(`/api/logistica/tarifas/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData)
            });

            if (res.ok) {
                mutate('/api/logistica/tarifas');
                setEditingId(null);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const tipologias = ['parcel', 'miniQuarter', 'quarter', 'miniLight', 'half', 'light', 'megaLight', 'full', 'megaFull'];

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h3 className="card-title">
                    <Truck className="w-5 h-5" />
                    Tarifas de Transporte Pallex 2026
                </h3>

                <div className="form-control mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por provincia o código postal..."
                        className="input input-bordered"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="table table-xs table-pin-rows">
                        <thead>
                            <tr>
                                <th>Provincia</th>
                                <th>CP</th>
                                <th>PARCEL</th>
                                <th>MINI Q</th>
                                <th>QUARTER</th>
                                <th>MINI L</th>
                                <th>HALF</th>
                                <th>LIGHT</th>
                                <th>MEGA L</th>
                                <th>FULL</th>
                                <th>MEGA F</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTarifas.slice(0, 20).map((tarifa) => (
                                <tr key={tarifa.id} className="hover">
                                    <td className="font-semibold">{tarifa.provincia}</td>
                                    <td>{tarifa.codigoPostal}</td>
                                    {editingId === tarifa.id ? (
                                        <>
                                            {tipologias.map(tip => (
                                                <td key={tip}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="input input-xs input-bordered w-16"
                                                        value={editData[tip] || 0}
                                                        onChange={(e) => setEditData(prev => ({ ...prev, [tip]: parseFloat(e.target.value) }))}
                                                    />
                                                </td>
                                            ))}
                                            <td>
                                                <div className="join">
                                                    <button className="btn btn-xs btn-success join-item" onClick={handleSave}>
                                                        <CheckCircle className="w-3 h-3" />
                                                    </button>
                                                    <button className="btn btn-xs btn-ghost join-item" onClick={handleCancel}>✕</button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {tipologias.map(tip => (
                                                <td key={tip}>{tarifa[tip]?.toFixed(0) || '-'}</td>
                                            ))}
                                            <td>
                                                <button className="btn btn-xs btn-ghost" onClick={() => handleEdit(tarifa)}>
                                                    <Settings className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTarifas.length > 20 && (
                    <div className="alert alert-info mt-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">Mostrando 20 de {filteredTarifas.length} resultados. Usa el buscador para filtrar.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ConfiguracionLogisticaPage() {
    const { data: configsPaletizado, isLoading: loadingPaletizado } = useSWR('/api/logistica/config-paletizado');
    const { data: tarifas, isLoading: loadingTarifas } = useSWR('/api/logistica/tarifas');

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Settings className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Configuración Logística</h1>
                </div>
                <Link href="/calculadora/logistica" className="btn btn-primary btn-sm">
                    Ir a Calculadora
                </Link>
            </div>

            {/* Configuración de Paletizado */}
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-4">Costes de Paletizado</h2>
                {loadingPaletizado ? (
                    <div className="flex justify-center py-10">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {configsPaletizado?.map(config => (
                            <ConfigPaletizadoForm key={config.id} config={config} />
                        ))}
                    </div>
                )}
            </div>

            {/* Tarifas de Transporte */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Tarifas de Transporte</h2>
                    <a href="/api/export/csv?model=tarifaLogistica" target="_blank" className="btn btn-sm btn-outline btn-success gap-2">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </a>
                </div>
                {loadingTarifas ? (
                    <div className="flex justify-center py-10">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <TablaTarifas tarifas={tarifas} />
                )}
            </div>
        </div>
    );
}
