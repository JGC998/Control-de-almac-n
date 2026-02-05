"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, Plus, Info } from 'lucide-react';
import { formatCurrency } from '@/utils/utils';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ModalConfiguracionTacos({ isOpen, onClose, onConfirm, anchoBanda, largoBanda }) {
    const [tipoTaco, setTipoTaco] = useState('RECTO');
    const [alturaTaco, setAlturaTaco] = useState('');
    const [pasoEntreTacos, setPasoEntreTacos] = useState('');

    const { data: tacos, isLoading } = useSWR('/api/tacos', fetcher);

    // Filtrar tacos por tipo seleccionado
    const tacosDisponibles = useMemo(() => {
        if (!tacos) return [];
        return tacos.filter(t => t.tipo === tipoTaco).sort((a, b) => a.altura - b.altura);
    }, [tacos, tipoTaco]);

    // Obtener el taco seleccionado
    const tacoSeleccionado = useMemo(() => {
        if (!alturaTaco || !tacos) return null;
        return tacos.find(t => t.tipo === tipoTaco && t.altura === parseInt(alturaTaco));
    }, [tacos, tipoTaco, alturaTaco]);

    // Cálculos
    const calculo = useMemo(() => {
        if (!anchoBanda || !largoBanda || !pasoEntreTacos || !tacoSeleccionado) {
            return { isValid: false };
        }

        const anchoMm = parseFloat(anchoBanda);
        const largoMm = parseFloat(largoBanda);
        const pasoMm = parseFloat(pasoEntreTacos);

        if (anchoMm <= 0 || largoMm <= 0 || pasoMm <= 0) {
            return { isValid: false };
        }

        // Longitud del taco = ancho de banda - 10mm (margen)
        const longitudTacoMm = anchoMm - 10;
        const longitudTacoM = longitudTacoMm / 1000;

        // Cantidad de tacos = largo de banda / paso
        const cantidadTacos = Math.floor(largoMm / pasoMm);

        // Metros lineales totales
        const metrosLineales = longitudTacoM * cantidadTacos;

        // Coste total
        const costeTacos = metrosLineales * tacoSeleccionado.precioMetro;

        return {
            isValid: true,
            longitudTacoMm,
            longitudTacoM,
            cantidadTacos,
            metrosLineales,
            precioMetro: tacoSeleccionado.precioMetro,
            costeTacos,
        };
    }, [anchoBanda, largoBanda, pasoEntreTacos, tacoSeleccionado]);

    const handleConfirm = () => {
        if (!calculo.isValid) return;

        const configuracion = {
            tipo: tipoTaco,
            altura: parseInt(alturaTaco),
            paso: parseFloat(pasoEntreTacos),
            longitudTaco: calculo.longitudTacoMm,
            cantidadTacos: calculo.cantidadTacos,
            metrosLineales: calculo.metrosLineales,
            precioMetro: calculo.precioMetro,
            costeTacos: calculo.costeTacos,
        };

        onConfirm(configuracion);
        onClose();
    };

    const handleReset = () => {
        setTipoTaco('RECTO');
        setAlturaTaco('');
        setPasoEntreTacos('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box w-11/12 max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Configurar Tacos
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Información de la banda */}
                        <div className="alert alert-info">
                            <Info className="w-4 h-4" />
                            <span className="text-sm">
                                Banda: {anchoBanda}mm × {largoBanda}mm
                            </span>
                        </div>

                        {/* Tipo de taco */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Tipo de Taco</span>
                            </label>
                            <div className="join w-full grid grid-cols-2">
                                <input
                                    className="join-item btn"
                                    type="radio"
                                    name="tipo"
                                    aria-label="Recto"
                                    checked={tipoTaco === 'RECTO'}
                                    onChange={() => { setTipoTaco('RECTO'); setAlturaTaco(''); }}
                                />
                                <input
                                    className="join-item btn"
                                    type="radio"
                                    name="tipo"
                                    aria-label="Inclinado"
                                    checked={tipoTaco === 'INCLINADO'}
                                    onChange={() => { setTipoTaco('INCLINADO'); setAlturaTaco(''); }}
                                />
                            </div>
                        </div>

                        {/* Altura del taco */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Altura del Taco</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={alturaTaco}
                                onChange={(e) => setAlturaTaco(e.target.value)}
                            >
                                <option value="">Seleccionar altura...</option>
                                {tacosDisponibles.map(taco => (
                                    <option key={taco.id} value={taco.altura}>
                                        {taco.altura}mm - {formatCurrency(taco.precioMetro)}/m
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Paso entre tacos */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-bold">Paso entre Tacos (mm)</span>
                                <span className="label-text-alt">Distancia entre tacos</span>
                            </label>
                            <input
                                type="number"
                                className="input input-bordered w-full"
                                value={pasoEntreTacos}
                                onChange={(e) => setPasoEntreTacos(e.target.value)}
                                placeholder="250"
                            />
                        </div>

                        {/* Resultado del cálculo */}
                        {calculo.isValid && (
                            <div className="bg-base-200 p-4 rounded-lg space-y-2">
                                <h4 className="font-bold text-sm uppercase text-gray-500">Resumen</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Longitud taco:</span>
                                        <span className="font-bold ml-2">{calculo.longitudTacoMm}mm</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Cantidad:</span>
                                        <span className="font-bold ml-2">{calculo.cantidadTacos} tacos</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Metros lineales:</span>
                                        <span className="font-bold ml-2">{calculo.metrosLineales.toFixed(2)}m</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Precio/metro:</span>
                                        <span className="font-bold ml-2">{formatCurrency(calculo.precioMetro)}</span>
                                    </div>
                                </div>
                                <div className="divider my-2"></div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500">Coste Total Tacos</div>
                                    <div className="text-2xl font-black text-primary">
                                        {formatCurrency(calculo.costeTacos)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="modal-action">
                            <button className="btn" onClick={handleReset}>
                                Limpiar
                            </button>
                            <button className="btn" onClick={onClose}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirm}
                                disabled={!calculo.isValid}
                            >
                                <Plus className="w-4 h-4" />
                                Confirmar Tacos
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
