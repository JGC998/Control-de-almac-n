"use client";
import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { Plus, Settings, Info, Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';
import ModalConfiguracionTacos from './ModalConfiguracionTacos';


const CostInput = ({ label, value, onChange, unit = '€', description }) => (
    <div className="form-control w-full">
        <label className="label py-1">
            <span className="label-text-alt font-semibold">{label}</span>
        </label>
        <div className="join w-full">
            <input
                type="number"
                step="0.01"
                className="input input-sm input-bordered join-item w-full"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            />
            <span className="btn btn-sm join-item no-animation bg-base-200 border-base-300 pointer-events-none">{unit}</span>
        </div>
        {description ? (
            <div key="cost-description" className="px-1 pt-1 opacity-70">
                <p className="text-[10px] leading-tight text-gray-500">{description}</p>
            </div>
        ) : null}
    </div>
);

export default function CalculadoraBandas({ onAddItem, className = "" }) {
    // --- Estado Item ---
    const [selectedMaterial] = useState('PVC'); // Siempre PVC
    const [selectedEspesor, setSelectedEspesor] = useState('');
    const [selectedColor, setSelectedColor] = useState(''); // Nuevo: color para PVC
    const [selectedMarginId, setSelectedMarginId] = useState('');
    const [tipoConfeccion, setTipoConfeccion] = useState('VULCANIZADA');

    const [unidades, setUnidades] = useState('1');
    const [ancho, setAncho] = useState('');
    const [largo, setLargo] = useState('');

    // --- Configuración de Costes (Defaults editables) ---
    const [costeVulcanizadoMetro, setCosteVulcanizadoMetro] = useState(50);
    const [costeGrapaMetro, setCosteGrapaMetro] = useState(30);
    const [mostrarConfigCostes, setMostrarConfigCostes] = useState(false);

    // --- Estado Tacos ---
    const [configuracionTacos, setConfiguracionTacos] = useState(null);
    const [mostrarModalTacos, setMostrarModalTacos] = useState(false);

    // --- Carga de Datos ---
    const { data: tarifas, isLoading: tarifasLoading } = useSWR('/api/precios');
    const { data: materiales, isLoading: materialesLoading } = useSWR('/api/materiales');
    const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');

    const uniqueMaterials = materiales?.map(m => m.nombre).sort() || [];

    // Colores disponibles para PVC
    const coloresPVC = ['VERDE', 'BLANCO', 'AZUL', 'NEGRO'];
    const isPVC = selectedMaterial === 'PVC';

    const availableEspesores = useMemo(() => {
        if (!tarifas || !selectedMaterial) return [];
        // Mostrar todos los espesores de PVC sin filtrar por color
        const espesores = tarifas
            .filter(t => t.material === selectedMaterial)
            .map(t => String(t.espesor));
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, selectedMaterial]);

    const selectedMargin = useMemo(() => {
        if (!margenes || !selectedMarginId) return null;
        return margenes.find(m => m.id === selectedMarginId);
    }, [margenes, selectedMarginId]);



    // --- CÁLCULO ---
    const currentCalculation = useMemo(() => {
        const unas = parseInt(unidades) || 0;
        const ancMm = parseFloat(ancho) || 0;
        const larMm = parseFloat(largo) || 0;

        if (!tarifas || !selectedMaterial || !selectedEspesor || unas <= 0 || ancMm <= 0 || larMm <= 0) {
            return { isValid: false, precioUnitario: 0, precioTotal: 0 };
        }

        // Para PVC, también necesitamos el color
        if (isPVC && !selectedColor) {
            return { isValid: false, errorMessage: 'Selecciona un color para PVC' };
        }

        const tarifa = tarifas.find(t =>
            t.material === selectedMaterial &&
            Number(t.espesor) === Number(selectedEspesor) &&
            (!isPVC || t.color === selectedColor)
        );
        if (!tarifa) return { isValid: false, errorMessage: 'Tarifa no encontrada' };

        const ancM = ancMm / 1000;
        const larM = larMm / 1000;
        const area = ancM * larM;

        // 0. Margen
        const multiplicador = selectedMargin?.multiplicador || 1;

        // 1. Coste Material Base
        const costeMaterialBase = (tarifa.precio * multiplicador) * area;

        // 2. Coste Confección
        let costeConfeccion = 0;
        let desglose = '';

        if (tipoConfeccion === 'VULCANIZADA') {
            const costeVulcanizado = costeVulcanizadoMetro * ancM;
            costeConfeccion = costeVulcanizado;
            desglose = `Vulcanizado (${formatCurrency(costeVulcanizado)})`;
        } else if (tipoConfeccion === 'GRAPA') {
            const costeGrapa = costeGrapaMetro * ancM;
            costeConfeccion = costeGrapa;
            desglose = `Grapa (${formatCurrency(costeGrapa)})`;
        }

        // 3. Coste Tacos (si están configurados)
        const costeTacos = configuracionTacos ? configuracionTacos.costeTacos : 0;

        const precioUnitario = costeMaterialBase + costeConfeccion + costeTacos;

        return {
            isValid: true,
            precioBaseM2: tarifa.precio,
            precioMaterial: costeMaterialBase,
            costeConfeccion,
            desgloseConfeccion: desglose,
            costeTacos,
            precioUnitario,
            precioTotal: precioUnitario * unas,
            pesoTotal: (tarifa.peso * area) * unas
        };
    }, [tarifas, selectedMaterial, selectedEspesor, selectedColor, selectedMargin, unidades, ancho, largo, tipoConfeccion, costeVulcanizadoMetro, costeGrapaMetro, configuracionTacos, isPVC]);

    // --- HANDLER ---
    const handleAdd = () => {
        if (!currentCalculation.isValid) return;

        const tipoLabel = {
            'VULCANIZADA': 'Cerrada Sin Fin',
            'GRAPA': 'Cerrada con Grapa'
        }[tipoConfeccion];

        let descripcion = `${selectedMaterial} ${selectedEspesor}mm`;
        if (isPVC && selectedColor) {
            descripcion += ` ${selectedColor}`;
        }
        descripcion += ` - ${tipoLabel}`;

        if (configuracionTacos) {
            descripcion += ` + Tacos ${configuracionTacos.tipo} ${configuracionTacos.altura}mm`;
        }

        const item = {
            descripcion,
            detalles: `${ancho}x${largo}mm`,
            dimensiones: { ancho, largo, espesor: selectedEspesor },
            material: selectedMaterial,
            tipoConfeccion,
            medidas: `${ancho}x${largo}`,
            unidades: parseInt(unidades),
            precioUnitario: currentCalculation.precioUnitario,
            precioTotal: currentCalculation.precioTotal,
            pesoTotal: currentCalculation.pesoTotal,
            pesoUnitario: currentCalculation.pesoTotal / parseInt(unidades),
            tacos: configuracionTacos // Incluir configuración de tacos si existe
        };

        onAddItem(item);
        // Reset tacos después de añadir
        setConfiguracionTacos(null);
    };

    if (tarifasLoading || materialesLoading) return <div className="p-10 text-center"><span className="loading loading-dots loading-lg"></span></div>;

    return (
        <div className={`card bg-base-100 shadow-xl h-fit ${className}`}>
            <div className="card-body">
                <h2 className="card-title text-sm uppercase text-gray-400">Configuración de Banda</h2>

                {/* Espesor (Material PVC fijo) */}
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Espesor (PVC)</span></label>
                    <select className="select select-bordered w-full" value={selectedEspesor} onChange={e => setSelectedEspesor(e.target.value)}>
                        <option value="">Seleccionar espesor...</option>
                        {availableEspesores.map(e => <option key={e} value={e}>{e} mm</option>)}
                    </select>
                </div>

                {/* Color selector - Solo para PVC */}
                {isPVC ? (
                    <div key="color-selector" className="form-control w-full mt-2">
                        <label className="label"><span className="label-text">Color</span></label>
                        <select className="select select-bordered w-full" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}>
                            <option value="">Seleccionar color...</option>
                            {coloresPVC.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                ) : null}

                {/* Margen Selector */}
                <div className="form-control w-full mt-2">
                    <label className="label"><span className="label-text">Margen / Tarifa</span></label>
                    <select className="select select-bordered w-full" value={selectedMarginId} onChange={e => setSelectedMarginId(e.target.value)}>
                        <option value="">x1.00 (Base)</option>
                        {margenes?.map(m => <option key={m.id} value={m.id}>{m.descripcion} (x{m.multiplicador})</option>)}
                    </select>
                </div>

                {/* Dimensiones */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="form-control">
                        <label className="label"><span className="label-text">Ancho (mm)</span></label>
                        <input type="number" className="input input-bordered" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="0" />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Largo (mm)</span></label>
                        <input type="number" className="input input-bordered" value={largo} onChange={e => setLargo(e.target.value)} placeholder="0" />
                    </div>
                </div>

                <div className="divider my-1"></div>

                {/* Tipo Confección */}
                <div className="form-control">
                    <label className="label"><span className="label-text font-bold">Tipo de Confección</span></label>
                    <div className="join w-full grid grid-cols-2">
                        <input className="join-item btn btn-sm" type="radio" name="options" aria-label="Sin Fin" checked={tipoConfeccion === 'VULCANIZADA'} onChange={() => setTipoConfeccion('VULCANIZADA')} />
                        <input className="join-item btn btn-sm" type="radio" name="options" aria-label="Grapa" checked={tipoConfeccion === 'GRAPA'} onChange={() => setTipoConfeccion('GRAPA')} />
                    </div>
                </div>

                {/* Botón Configurar Tacos */}
                <div className="mt-2">
                    <button
                        className={`btn btn-sm w-full ${configuracionTacos ? 'btn-success' : 'btn-outline'
                            }`}
                        onClick={() => setMostrarModalTacos(true)}
                        disabled={!ancho || !largo}
                    >
                        <Layers className="w-4 h-4" />
                        {configuracionTacos
                            ? `Tacos: ${configuracionTacos.tipo} ${configuracionTacos.altura}mm (${configuracionTacos.cantidadTacos} uds)`
                            : 'Configurar Tacos (Opcional)'}
                    </button>
                    {configuracionTacos ? (
                        <button
                            key="remove-tacos-btn"
                            className="btn btn-xs btn-ghost w-full mt-1"
                            onClick={() => setConfiguracionTacos(null)}
                        >
                            Quitar Tacos
                        </button>
                    ) : null}
                </div>

                {/* Costes Extra (Colapsable) */}
                <div className="collapse collapse-arrow bg-base-200 mt-4 border border-base-300">
                    <input type="checkbox" checked={mostrarConfigCostes} onChange={() => setMostrarConfigCostes(!mostrarConfigCostes)} />
                    <div className="collapse-title text-sm font-medium flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Configuración de Costes
                    </div>
                    <div className="collapse-content space-y-3">
                        <CostInput
                            label="Coste Vulcanizado"
                            value={costeVulcanizadoMetro}
                            onChange={setCosteVulcanizadoMetro}
                            unit="€/m"
                            description="Precio por metro lineal de vulcanizado"
                        />
                        <CostInput
                            label="Coste Grapa"
                            value={costeGrapaMetro}
                            onChange={setCosteGrapaMetro}
                            unit="€/m"
                            description="Precio por metro lineal de grapa"
                        />
                    </div>
                </div>

                {/* Cantidad y Resultado */}
                <div className="mt-4 bg-base-200/50 p-4 rounded-lg border border-base-300">
                    <div className="form-control mb-4">
                        <label className="label p-0 mb-1"><span className="label-text font-bold">Cantidad</span></label>
                        <input type="number" className="input input-bordered w-full font-bold text-lg" value={unidades} onChange={e => setUnidades(e.target.value)} placeholder="1" />
                    </div>

                    {currentCalculation.isValid ? (
                        <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">
                                Mat: {formatCurrency(currentCalculation.precioMaterial)}
                                {currentCalculation.costeConfeccion > 0 && ` + Conf: ${formatCurrency(currentCalculation.costeConfeccion)}`}
                                {currentCalculation.costeTacos > 0 && ` + Tacos: ${formatCurrency(currentCalculation.costeTacos)}`}
                            </div>
                            <div className="text-2xl font-black text-primary">{formatCurrency(currentCalculation.precioUnitario)}</div>
                            <div className="text-xs text-gray-400">Precio Unitario</div>
                            {currentCalculation.costeConfeccion > 0 && (
                                <div className="alert alert-info shadow-sm mt-2 text-[10px] p-2 flex gap-1">
                                    <Info className="w-3 h-3" />
                                    <span>{currentCalculation.desgloseConfeccion}</span>
                                </div>
                            )}
                            {configuracionTacos && (
                                <div className="alert alert-success shadow-sm mt-2 text-[10px] p-2 flex gap-1">
                                    <Layers className="w-3 h-3" />
                                    <span>
                                        {configuracionTacos.cantidadTacos} tacos {configuracionTacos.tipo.toLowerCase()} {configuracionTacos.altura}mm
                                        ({configuracionTacos.metrosLineales.toFixed(2)}m lineales)
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-sm text-gray-400 py-2">
                            Completa los datos para calcular
                        </div>
                    )}
                </div>

                <button className="btn btn-primary w-full mt-4" onClick={handleAdd} disabled={!currentCalculation.isValid}>
                    <Plus className="w-4 h-4" /> Añadir Banda
                </button>
            </div>

            {/* Modal de Configuración de Tacos */}
            <ModalConfiguracionTacos
                isOpen={mostrarModalTacos}
                onClose={() => setMostrarModalTacos(false)}
                onConfirm={setConfiguracionTacos}
                anchoBanda={ancho}
                largoBanda={largo}
            />
        </div>
    );
}
