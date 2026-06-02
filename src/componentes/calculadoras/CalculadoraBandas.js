"use client";
import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, Settings, Info, Layers, Link2, BookmarkPlus, Check, Calculator } from 'lucide-react';
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
        {description && (
            <p className="text-[10px] leading-tight text-gray-500 px-1 pt-1 opacity-70">{description}</p>
        )}
    </div>
);

export default function CalculadoraBandas({ onAddItem, className = "" }) {
    const [selectedMaterial] = useState('PVC');
    const [selectedEspesor, setSelectedEspesor] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [tipoConfeccion, setTipoConfeccion] = useState('VULCANIZADA');
    const [tipoGrapa, setTipoGrapa] = useState('NORMAL'); // 'NORMAL' | 'UNA'

    const [unidades, setUnidades] = useState('1');
    const [ancho, setAncho] = useState('');
    const [largo, setLargo] = useState('');

    const [costeVulcanizadoMetro, setCosteVulcanizadoMetro] = useState(0);
    const [mostrarConfigCostes, setMostrarConfigCostes] = useState(false);

    const [configuracionTacos, setConfiguracionTacos] = useState(null);
    const [mostrarModalTacos, setMostrarModalTacos] = useState(false);
    const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
    const [catalogoGuardado, setCatalogoGuardado] = useState(false);
    const [referenciaBanda, setReferenciaBanda] = useState('');

    const { data: tarifas, isLoading: tarifasLoading } = useSWR('/api/precios');
    const { data: modelosGrapaData } = useSWR('/api/modelos-grapa');

    const isPVC = selectedMaterial === 'PVC';

    const PVC_COLORS = ['AZUL', 'BLANCO', 'NEGRO', 'VERDE'];

    const availableEspesores = useMemo(() => {
        if (!tarifas || !selectedMaterial) return [];
        const espesores = tarifas
            .filter(t => t.material === selectedMaterial)
            .map(t => String(t.espesor));
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, selectedMaterial]);

    const todosModelosGrapa = modelosGrapaData?.modelos ?? [];
    const mermaGrapaPct = modelosGrapaData?.mermaGrapaPct ?? 20;

    // Modelos compatibles según espesor + tipo seleccionado
    const modelosCompatibles = useMemo(() => {
        if (!selectedEspesor || !todosModelosGrapa.length) return [];
        const esp = parseFloat(selectedEspesor);
        return todosModelosGrapa.filter(m => {
            if (m.tipo !== tipoGrapa) return false;
            if (m.tipo === 'UNA') return Math.abs(m.espesorDesde - esp) < 0.01;
            return esp >= m.espesorDesde && esp <= (m.espesorHasta ?? Infinity);
        });
    }, [todosModelosGrapa, selectedEspesor, tipoGrapa]);

    // Auto-selección: si cambia espesor o tipo, elegir el primer compatible
    const [modeloGrapaId, setModeloGrapaId] = useState('');
    const modeloGrapaSeleccionado = useMemo(() => {
        if (!modeloGrapaId) return modelosCompatibles[0] ?? null;
        return modelosCompatibles.find(m => m.id === parseInt(modeloGrapaId, 10)) ?? modelosCompatibles[0] ?? null;
    }, [modelosCompatibles, modeloGrapaId]);

    // Cálculo del coste de grapa basado en anchos de rollo disponibles
    const calculoGrapa = useMemo(() => {
        if (!modeloGrapaSeleccionado || !ancho) return null;
        const anchoBandaMm = parseFloat(ancho);
        if (!anchoBandaMm || anchoBandaMm <= 0) return null;

        const anchos = Array.isArray(modeloGrapaSeleccionado.anchosDisponibles)
            ? modeloGrapaSeleccionado.anchosDisponibles.slice().sort((a, b) => a - b)
            : [];

        let anchoRollo = null;
        let advertencia = null;

        if (anchos.length > 0) {
            // Buscar el rollo más pequeño que cubre el ancho de la banda
            anchoRollo = anchos.find(a => a >= anchoBandaMm) ?? null;
            if (!anchoRollo) {
                anchoRollo = anchos[anchos.length - 1]; // el más ancho disponible
                advertencia = `La banda (${anchoBandaMm}mm) supera el rollo más ancho (${anchoRollo}mm)`;
            }
        }

        const precio = modeloGrapaSeleccionado.precioMetroLineal;

        if (anchoRollo) {
            // Cálculo preciso: se consume el rollo entero × 2 extremos
            const coste = 2 * (anchoRollo / 1000) * precio;
            const desperdicio = anchoRollo - anchoBandaMm;
            return {
                coste: Math.round(coste * 10000) / 10000,
                anchoRollo,
                desperdicio,
                advertencia,
                modo: 'rollo',
            };
        } else {
            // Fallback: porcentaje de merma configurado
            const coste = 2 * (anchoBandaMm / 1000) * (1 + mermaGrapaPct / 100) * precio;
            return {
                coste: Math.round(coste * 10000) / 10000,
                anchoRollo: null,
                desperdicio: null,
                advertencia: null,
                modo: 'porcentaje',
                mermaGrapaPct,
            };
        }
    }, [modeloGrapaSeleccionado, ancho, mermaGrapaPct]);

    const currentCalculation = useMemo(() => {
        const unas = parseInt(unidades) || 0;
        const ancMm = parseFloat(ancho) || 0;
        const larMm = parseFloat(largo) || 0;

        if (!tarifas || !selectedEspesor || unas <= 0 || ancMm <= 0 || larMm <= 0) {
            return { isValid: false };
        }
        if (isPVC && !selectedColor) {
            return { isValid: false, errorMessage: 'Selecciona un color para PVC' };
        }
        if (tipoConfeccion === 'GRAPA' && !modeloGrapaSeleccionado) {
            return { isValid: false, errorMessage: 'No hay modelo de grapa compatible con ese espesor. Configura los modelos en Configuración → Grapas.' };
        }

        const tarifa = tarifas.find(t =>
            t.material === selectedMaterial &&
            Number(t.espesor) === Number(selectedEspesor)
        );
        if (!tarifa) return { isValid: false, errorMessage: 'Tarifa no encontrada para esa combinación' };

        const ancM = ancMm / 1000;
        const larM = larMm / 1000;
        const area = ancM * larM;

        const costeMaterialBase = tarifa.precio * area;

        let costeConfeccion = 0;
        let desgloseConfeccion = '';

        if (tipoConfeccion === 'VULCANIZADA') {
            costeConfeccion = costeVulcanizadoMetro * ancM;
            desgloseConfeccion = `Vulcanizado (${formatCurrency(costeConfeccion)})`;
        } else if (tipoConfeccion === 'GRAPA' && calculoGrapa) {
            costeConfeccion = calculoGrapa.coste;
            if (calculoGrapa.modo === 'rollo') {
                desgloseConfeccion = `Grapa ${modeloGrapaSeleccionado.nombre} · rollo ${calculoGrapa.anchoRollo}mm · desperdicio ${calculoGrapa.desperdicio}mm/extremo`;
            } else {
                desgloseConfeccion = `Grapa ${modeloGrapaSeleccionado.nombre} · merma ${calculoGrapa.mermaGrapaPct}%`;
            }
        }

        const costeTacos = configuracionTacos?.costeTacos ?? 0;
        const precioUnitario = Math.round((costeMaterialBase + costeConfeccion + costeTacos) * 100) / 100;

        return {
            isValid: true,
            precioMaterial: Math.round(costeMaterialBase * 100) / 100,
            costeConfeccion: Math.round(costeConfeccion * 100) / 100,
            desgloseConfeccion,
            costeTacos: Math.round(costeTacos * 100) / 100,
            precioUnitario,
            precioTotal: Math.round(precioUnitario * unas * 100) / 100,
            pesoTotal: (tarifa.peso * area) * unas,
            tarifaPrecio: tarifa.precio,
            area,
        };
    }, [tarifas, selectedMaterial, selectedEspesor, selectedColor, tipoConfeccion, unidades, ancho, largo, costeVulcanizadoMetro, configuracionTacos, isPVC, modeloGrapaSeleccionado, calculoGrapa]);

    const handleAdd = () => {
        if (!currentCalculation.isValid) return;

        const tipoLabel = tipoConfeccion === 'VULCANIZADA' ? 'Cerrada Sin Fin' : tipoConfeccion === 'GRAPA' ? 'Cerrada con Grapa' : 'Abierta';
        let descripcion = `${selectedMaterial} ${selectedEspesor}mm`;
        if (isPVC && selectedColor) descripcion += ` ${selectedColor}`;
        descripcion += ` - ${tipoLabel}`;
        if (configuracionTacos) descripcion += ` + Tacos ${configuracionTacos.tipo} ${configuracionTacos.altura}mm`;

        const uds = parseInt(unidades);
        const item = {
            descripcion,
            dimensiones: { ancho, largo, espesor: selectedEspesor },
            color: selectedColor,
            material: selectedMaterial,
            tipoConfeccion,
            grapa: tipoConfeccion === 'GRAPA' ? modeloGrapaSeleccionado : null,
            calculoGrapa: tipoConfeccion === 'GRAPA' ? calculoGrapa : null,
            unidades: uds,
            precioUnitario: currentCalculation.precioUnitario,
            precioTotal: currentCalculation.precioTotal,
            pesoTotal: currentCalculation.pesoTotal,
            pesoUnitario: currentCalculation.pesoTotal / uds,
            tacos: configuracionTacos || null,
            precioMaterial: currentCalculation.precioMaterial,
            costeVulcanizado: currentCalculation.costeConfeccion,
            costeTacos: currentCalculation.costeTacos,
        };

        onAddItem(item);
        setConfiguracionTacos(null);
    };

    const handleGuardarEnCatalogo = async () => {
        if (!currentCalculation.isValid) return;
        setGuardandoCatalogo(true);
        const tipoLabel = tipoConfeccion === 'VULCANIZADA' ? 'Sin Fin' : tipoConfeccion === 'GRAPA' ? 'Con Grapa' : 'Abierta';
        let nombre = referenciaBanda.trim() ? `${referenciaBanda.trim()} — ` : '';
        nombre += `PVC ${selectedEspesor}mm`;
        if (selectedColor) nombre += ` ${selectedColor}`;
        nombre += ` - ${tipoLabel} - ${ancho}×${largo}mm`;
        if (configuracionTacos) nombre += ` + Tacos ${configuracionTacos.tipo} ${configuracionTacos.altura}mm`;

        const uds = parseInt(unidades) || 1;
        try {
            const res = await fetch('/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    referenciaFabricante: 'BANDA_PVC',
                    color: selectedColor || null,
                    espesor: parseFloat(selectedEspesor),
                    ancho: parseFloat(ancho),
                    largo: parseFloat(largo),
                    precioUnitario: currentCalculation.precioUnitario,
                    pesoUnitario: currentCalculation.pesoTotal / uds,
                    tieneTroquel: false,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.error || 'Error al guardar');
            }
            await mutate('/api/productos');
            setCatalogoGuardado(true);
            setTimeout(() => setCatalogoGuardado(false), 3000);
        } catch (err) {
            alert(`No se pudo guardar en el catálogo: ${err.message}`);
        } finally {
            setGuardandoCatalogo(false);
        }
    };

    if (tarifasLoading) return <div className="p-10 text-center"><span className="loading loading-dots loading-lg"></span></div>;

    return (
        <div className={`card bg-base-100 shadow-xl h-fit ${className}`}>
            <div className="card-body">
                <h2 className="card-title text-sm uppercase text-gray-400">Configuración de Banda</h2>

                {/* Espesor */}
                <div className="form-control w-full">
                    <label className="label"><span className="label-text">Espesor (PVC)</span></label>
                    <select className="select select-bordered w-full" value={selectedEspesor} onChange={e => { setSelectedEspesor(e.target.value); setModeloGrapaId(''); }}>
                        <option value="">Seleccionar espesor...</option>
                        {availableEspesores.map(e => <option key={e} value={e}>{e} mm</option>)}
                    </select>
                </div>

                {/* Color */}
                {isPVC && (
                    <div className="form-control w-full mt-2">
                        <label className="label"><span className="label-text">Color</span></label>
                        <select className="select select-bordered w-full" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}>
                            <option value="">Seleccionar color...</option>
                            {PVC_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}

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
                    <label className="label"><span className="label-text font-bold">Tipo de Vulcanizado</span></label>
                    <div className="join w-full grid grid-cols-3">
                        <input className="join-item btn btn-sm" type="radio" name="tipo-confeccion" aria-label="Sin Fin"
                            checked={tipoConfeccion === 'VULCANIZADA'} onChange={() => setTipoConfeccion('VULCANIZADA')} />
                        <input className="join-item btn btn-sm" type="radio" name="tipo-confeccion" aria-label="Grapa"
                            checked={tipoConfeccion === 'GRAPA'} onChange={() => { setTipoConfeccion('GRAPA'); setModeloGrapaId(''); }} />
                        <input className="join-item btn btn-sm" type="radio" name="tipo-confeccion" aria-label="Abierta"
                            checked={tipoConfeccion === 'ABIERTA'} onChange={() => setTipoConfeccion('ABIERTA')} />
                    </div>
                </div>

                {/* Selector de Grapa (visible solo cuando confección = GRAPA) */}
                {tipoConfeccion === 'GRAPA' && (
                    <div className="space-y-2 mt-2">
                        {/* Toggle Normal / Uña */}
                        <div className="form-control w-full">
                            <label className="label py-1">
                                <span className="label-text font-bold flex items-center gap-1">
                                    <Link2 className="w-3.5 h-3.5 text-primary" /> Subtipo de grapa
                                </span>
                            </label>
                            <div className="join w-full grid grid-cols-2">
                                <input
                                    className="join-item btn btn-sm"
                                    type="radio"
                                    name="tipo-grapa"
                                    aria-label="Normal"
                                    checked={tipoGrapa === 'NORMAL'}
                                    onChange={() => { setTipoGrapa('NORMAL'); setModeloGrapaId(''); }}
                                />
                                <input
                                    className="join-item btn btn-sm"
                                    type="radio"
                                    name="tipo-grapa"
                                    aria-label="Uña"
                                    checked={tipoGrapa === 'UNA'}
                                    onChange={() => { setTipoGrapa('UNA'); setModeloGrapaId(''); }}
                                />
                            </div>
                        </div>

                        {/* Selector de modelo de grapa */}
                        {(() => {
                            const modelosTipo = todosModelosGrapa.filter(m => m.tipo === tipoGrapa);
                            const compatiblesIds = new Set(modelosCompatibles.map(m => m.id));
                            const otrosModelos = modelosTipo.filter(m => !compatiblesIds.has(m.id));
                            const hayModelos = modelosTipo.length > 0;

                            const optionLabel = m => {
                                const rollos = Array.isArray(m.anchosDisponibles) && m.anchosDisponibles.length > 0
                                    ? ` · rollos: ${m.anchosDisponibles.join('/')}mm`
                                    : '';
                                return `${m.nombre} · ${formatCurrency(m.precioMetroLineal)}/m lineal${rollos}`;
                            };

                            if (!hayModelos) return (
                                <div className="alert alert-warning text-xs py-2">
                                    Sin modelos de grapa {tipoGrapa === 'UNA' ? 'de uña' : 'normal'} configurados.{' '}
                                    <a href="/configuracion/grapas" className="link font-semibold">Configurar</a>
                                </div>
                            );

                            return (
                                <div className="form-control w-full">
                                    <label className="label py-1">
                                        <span className="label-text text-xs">Modelo</span>
                                        {modeloGrapaSeleccionado && selectedEspesor && modelosCompatibles.length > 0 && (
                                            <span className="label-text-alt text-xs text-success">auto-sugerido para {selectedEspesor}mm</span>
                                        )}
                                    </label>
                                    <select
                                        className="select select-bordered select-sm w-full"
                                        value={modeloGrapaSeleccionado?.id ?? ''}
                                        onChange={e => setModeloGrapaId(e.target.value)}
                                    >
                                        <option value="">Seleccionar modelo...</option>
                                        {modelosCompatibles.length > 0 && (
                                            <optgroup label={selectedEspesor ? `Compatibles con ${selectedEspesor}mm` : 'Compatibles'}>
                                                {modelosCompatibles.map(m => (
                                                    <option key={m.id} value={m.id}>{optionLabel(m)}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {otrosModelos.length > 0 && (
                                            <optgroup label="Otros modelos">
                                                {otrosModelos.map(m => (
                                                    <option key={m.id} value={m.id}>{optionLabel(m)}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                            );
                        })()}

                        {/* Desglose coste grapa */}
                        {calculoGrapa && ancho && (
                            <div className={`rounded-lg px-3 py-2 text-xs space-y-0.5 ${calculoGrapa.advertencia ? 'bg-warning/10 border border-warning/30' : 'bg-base-200'}`}>
                                {calculoGrapa.modo === 'rollo' ? (
                                    <>
                                        <p><span className="opacity-60">Rollo seleccionado:</span> <span className="font-semibold">{calculoGrapa.anchoRollo} mm</span></p>
                                        <p><span className="opacity-60">Desperdicio:</span> <span className="font-semibold">{calculoGrapa.desperdicio} mm/extremo</span></p>
                                        <p><span className="opacity-60">Coste (2 extremos):</span> <span className="font-semibold text-primary">{formatCurrency(calculoGrapa.coste)}</span></p>
                                    </>
                                ) : (
                                    <>
                                        <p><span className="opacity-60">Merma aplicada:</span> <span className="font-semibold">{calculoGrapa.mermaGrapaPct}%</span></p>
                                        <p><span className="opacity-60">Coste (2 extremos):</span> <span className="font-semibold text-primary">{formatCurrency(calculoGrapa.coste)}</span></p>
                                    </>
                                )}
                                {calculoGrapa.advertencia && (
                                    <p className="text-warning font-medium">{calculoGrapa.advertencia}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Botón Configurar Tacos */}
                <div className="mt-2">
                    <button
                        className={`btn btn-sm w-full ${configuracionTacos ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => setMostrarModalTacos(true)}
                        disabled={!ancho || !largo}
                    >
                        <Layers className="w-4 h-4" />
                        {configuracionTacos
                            ? `Tacos: ${configuracionTacos.tipo} ${configuracionTacos.altura}mm (${configuracionTacos.cantidadTacos} uds)`
                            : 'Configurar Tacos (Opcional)'}
                    </button>
                    {configuracionTacos && (
                        <button className="btn btn-xs btn-ghost w-full mt-1" onClick={() => setConfiguracionTacos(null)}>
                            Quitar Tacos
                        </button>
                    )}
                </div>

                {/* Costes Extra (Colapsable) — solo vulcanizado */}
                {tipoConfeccion === 'VULCANIZADA' && <div className="collapse collapse-arrow bg-base-200 mt-4 border border-base-300">
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
                    </div>
                </div>}

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
                    ) : currentCalculation.errorMessage ? (
                        <div className="text-center text-sm text-warning py-2">{currentCalculation.errorMessage}</div>
                    ) : (
                        <div className="text-center text-sm text-gray-400 py-2">Completa los datos para calcular</div>
                    )}
                </div>

                {/* Desglose completo del cálculo (solo con grapa) */}
                {tipoConfeccion === 'GRAPA' && currentCalculation.isValid && calculoGrapa && (
                    <div className="collapse collapse-arrow bg-base-200 mt-3 border border-base-300 rounded-xl">
                        <input type="checkbox" />
                        <div className="collapse-title text-xs font-semibold flex items-center gap-2 py-2 min-h-0">
                            <Calculator className="w-3.5 h-3.5 text-base-content/50" />
                            Desglose del cálculo
                        </div>
                        <div className="collapse-content pb-3">
                            <div className="space-y-3 text-xs">

                                {/* Dimensiones */}
                                <div>
                                    <p className="font-semibold text-base-content/40 uppercase tracking-wide text-[10px] mb-1">Dimensiones</p>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Ancho</td>
                                                <td className="text-right font-mono">{ancho} mm = {(parseFloat(ancho)/1000).toFixed(4)} m</td>
                                            </tr>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Largo</td>
                                                <td className="text-right font-mono">{largo} mm = {(parseFloat(largo)/1000).toFixed(4)} m</td>
                                            </tr>
                                            <tr className="font-semibold border-t border-base-300">
                                                <td className="text-base-content/60 py-0.5">Área</td>
                                                <td className="text-right font-mono">
                                                    ({parseFloat(ancho)/1000}) × ({parseFloat(largo)/1000}) = <span className="text-primary">{currentCalculation.area?.toFixed(6)} m²</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="divider my-0.5" />

                                {/* Material */}
                                <div>
                                    <p className="font-semibold text-base-content/40 uppercase tracking-wide text-[10px] mb-1">Material</p>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Tarifa {selectedMaterial} {selectedEspesor}mm{selectedColor ? ` ${selectedColor}` : ''}</td>
                                                <td className="text-right font-mono">{formatCurrency(currentCalculation.tarifaPrecio)}/m²</td>
                                            </tr>
                                            <tr className="font-semibold border-t border-base-300">
                                                <td className="text-base-content/60 py-0.5 font-mono text-[10px]">
                                                    {formatCurrency(currentCalculation.tarifaPrecio)} × {currentCalculation.area?.toFixed(6)} m²
                                                </td>
                                                <td className="text-right font-mono text-primary">{formatCurrency(currentCalculation.precioMaterial)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="divider my-0.5" />

                                {/* Grapa */}
                                <div>
                                    <p className="font-semibold text-base-content/40 uppercase tracking-wide text-[10px] mb-1">Grapa</p>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Modelo</td>
                                                <td className="text-right font-semibold">{modeloGrapaSeleccionado?.nombre} ({tipoGrapa === 'UNA' ? 'Uña' : 'Normal'})</td>
                                            </tr>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Precio</td>
                                                <td className="text-right font-mono">{formatCurrency(modeloGrapaSeleccionado?.precioMetroLineal)}/m lineal</td>
                                            </tr>
                                            {calculoGrapa.modo === 'rollo' ? (
                                                <>
                                                    <tr>
                                                        <td className="text-base-content/60 py-0.5">Ancho banda</td>
                                                        <td className="text-right font-mono">{ancho} mm</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-base-content/60 py-0.5">Rollos disponibles</td>
                                                        <td className="text-right font-mono">{(modeloGrapaSeleccionado?.anchosDisponibles ?? []).join(' / ')} mm</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-base-content/60 py-0.5 font-semibold">Rollo usado</td>
                                                        <td className="text-right font-mono font-semibold">{calculoGrapa.anchoRollo} mm</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-base-content/60 py-0.5 pl-3">Desperdicio</td>
                                                        <td className="text-right font-mono text-error">{calculoGrapa.desperdicio} mm × 2 extremos</td>
                                                    </tr>
                                                    <tr className="font-semibold border-t border-base-300">
                                                        <td className="text-base-content/60 py-0.5 font-mono text-[10px]">
                                                            2 × ({calculoGrapa.anchoRollo}/1000 m) × {formatCurrency(modeloGrapaSeleccionado?.precioMetroLineal)}
                                                        </td>
                                                        <td className="text-right font-mono text-primary">{formatCurrency(calculoGrapa.coste)}</td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <>
                                                    <tr>
                                                        <td className="text-base-content/60 py-0.5">Merma aplicada</td>
                                                        <td className="text-right font-mono">{calculoGrapa.mermaGrapaPct}%</td>
                                                    </tr>
                                                    <tr className="font-semibold border-t border-base-300">
                                                        <td className="text-base-content/60 py-0.5 font-mono text-[10px]">
                                                            2 × ({ancho}/1000 m) × (1+{calculoGrapa.mermaGrapaPct}%) × {formatCurrency(modeloGrapaSeleccionado?.precioMetroLineal)}
                                                        </td>
                                                        <td className="text-right font-mono text-primary">{formatCurrency(calculoGrapa.coste)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="divider my-0.5" />

                                {/* Resumen final */}
                                <div>
                                    <p className="font-semibold text-base-content/40 uppercase tracking-wide text-[10px] mb-1">Resumen</p>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Material</td>
                                                <td className="text-right font-mono">{formatCurrency(currentCalculation.precioMaterial)}</td>
                                            </tr>
                                            <tr>
                                                <td className="text-base-content/60 py-0.5">Grapa</td>
                                                <td className="text-right font-mono">{formatCurrency(currentCalculation.costeConfeccion)}</td>
                                            </tr>
                                            {currentCalculation.costeTacos > 0 && (
                                                <tr>
                                                    <td className="text-base-content/60 py-0.5">Tacos</td>
                                                    <td className="text-right font-mono">{formatCurrency(currentCalculation.costeTacos)}</td>
                                                </tr>
                                            )}
                                            <tr className="border-t-2 border-base-content/20 font-bold text-sm">
                                                <td className="py-1">Total unitario</td>
                                                <td className="text-right font-mono text-primary">{formatCurrency(currentCalculation.precioUnitario)}</td>
                                            </tr>
                                            {parseInt(unidades) > 1 && (
                                                <tr>
                                                    <td className="text-base-content/60 py-0.5">× {unidades} unidades</td>
                                                    <td className="text-right font-mono font-semibold">{formatCurrency(currentCalculation.precioTotal)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {currentCalculation.isValid && (
                    <div className="form-control mt-4">
                        <label className="label py-1"><span className="label-text text-xs">Referencia (opcional, para guardar en catálogo)</span></label>
                        <input
                            type="text"
                            className="input input-sm input-bordered w-full"
                            placeholder="Ej: Cliente ABC, Banda estándar…"
                            value={referenciaBanda}
                            onChange={e => setReferenciaBanda(e.target.value)}
                        />
                    </div>
                )}

                <div className="flex gap-2 mt-2">
                    <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={!currentCalculation.isValid}>
                        <Plus className="w-4 h-4" /> Añadir Banda
                    </button>
                    {onAddItem && (
                        <button
                            className={`btn btn-outline ${catalogoGuardado ? 'btn-success' : 'btn-secondary'}`}
                            onClick={handleGuardarEnCatalogo}
                            disabled={!currentCalculation.isValid || guardandoCatalogo}
                            title="Guardar esta banda en el catálogo de productos"
                        >
                            {guardandoCatalogo ? <span className="loading loading-spinner loading-xs" /> : catalogoGuardado ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

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
