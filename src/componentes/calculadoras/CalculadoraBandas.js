"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Plus, Settings, Info, Layers, Link2, BookmarkPlus, Check } from 'lucide-react';
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
    const [selectedGrapaId, setSelectedGrapaId] = useState('');

    const [unidades, setUnidades] = useState('1');
    const [ancho, setAncho] = useState('');
    const [largo, setLargo] = useState('');

    const [costeVulcanizadoMetro, setCosteVulcanizadoMetro] = useState(50);
    const [mostrarConfigCostes, setMostrarConfigCostes] = useState(false);

    const [configuracionTacos, setConfiguracionTacos] = useState(null);
    const [mostrarModalTacos, setMostrarModalTacos] = useState(false);
    const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
    const [catalogoGuardado, setCatalogoGuardado] = useState(false);

    const { data: tarifas, isLoading: tarifasLoading } = useSWR('/api/precios');
    const { data: grapas, isLoading: grapasLoading } = useSWR('/api/grapas');

    const isPVC = selectedMaterial === 'PVC';

    const coloresPVC = useMemo(() => {
        if (!tarifas) return [];
        return [...new Set(
            tarifas
                .filter(t => t.material === 'PVC' && (!selectedEspesor || Number(t.espesor) === Number(selectedEspesor)))
                .map(t => t.color)
                .filter(Boolean)
        )].sort();
    }, [tarifas, selectedEspesor]);

    const availableEspesores = useMemo(() => {
        if (!tarifas || !selectedMaterial) return [];
        const espesores = tarifas
            .filter(t => t.material === selectedMaterial)
            .map(t => String(t.espesor));
        return [...new Set(espesores)].sort((a, b) => parseFloat(a) - parseFloat(b));
    }, [tarifas, selectedMaterial]);

    const selectedGrapa = useMemo(() => {
        if (!grapas || !selectedGrapaId) return null;
        return grapas.find(g => g.id === parseInt(selectedGrapaId));
    }, [grapas, selectedGrapaId]);

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
        if (tipoConfeccion === 'GRAPA' && !selectedGrapa) {
            return { isValid: false, errorMessage: 'Selecciona un tipo de grapa' };
        }

        const tarifa = tarifas.find(t =>
            t.material === selectedMaterial &&
            Number(t.espesor) === Number(selectedEspesor) &&
            (!isPVC || t.color === selectedColor)
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
        } else if (tipoConfeccion === 'GRAPA' && selectedGrapa) {
            costeConfeccion = selectedGrapa.precioMetro * ancM;
            desgloseConfeccion = `Grapa: ${selectedGrapa.nombre} (${formatCurrency(costeConfeccion)})`;
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
        };
    }, [tarifas, selectedMaterial, selectedEspesor, selectedColor, selectedGrapa, tipoConfeccion, unidades, ancho, largo, costeVulcanizadoMetro, configuracionTacos, isPVC]);

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
            grapa: tipoConfeccion === 'GRAPA' ? selectedGrapa : null,
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
        let nombre = `PVC ${selectedEspesor}mm`;
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
                    color: selectedColor || null,
                    espesor: parseFloat(selectedEspesor),
                    ancho: parseFloat(ancho),
                    largo: parseFloat(largo),
                    precioUnitario: currentCalculation.precioUnitario,
                    pesoUnitario: currentCalculation.pesoTotal / uds,
                    tieneTroquel: false,
                }),
            });
            if (!res.ok) throw new Error('Error al guardar');
            setCatalogoGuardado(true);
            setTimeout(() => setCatalogoGuardado(false), 3000);
        } catch {
            alert('No se pudo guardar en el catálogo.');
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
                    <select className="select select-bordered w-full" value={selectedEspesor} onChange={e => setSelectedEspesor(e.target.value)}>
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
                            {coloresPVC.map(c => <option key={c} value={c}>{c}</option>)}
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
                            checked={tipoConfeccion === 'VULCANIZADA'} onChange={() => { setTipoConfeccion('VULCANIZADA'); setSelectedGrapaId(''); }} />
                        <input className="join-item btn btn-sm" type="radio" name="tipo-confeccion" aria-label="Grapa"
                            checked={tipoConfeccion === 'GRAPA'} onChange={() => setTipoConfeccion('GRAPA')} />
                        <input className="join-item btn btn-sm" type="radio" name="tipo-confeccion" aria-label="Abierta"
                            checked={tipoConfeccion === 'ABIERTA'} onChange={() => { setTipoConfeccion('ABIERTA'); setSelectedGrapaId(''); }} />
                    </div>
                </div>

                {/* Selector de Grapa (visible solo cuando confección = GRAPA) */}
                {tipoConfeccion === 'GRAPA' && (
                    <div className="form-control w-full mt-2">
                        <label className="label">
                            <span className="label-text font-bold flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5 text-primary" /> Tipo de Grapa
                            </span>
                        </label>
                        {grapasLoading ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : !grapas || grapas.length === 0 ? (
                            <div className="alert alert-warning text-xs py-2">
                                No hay grapas configuradas. Ve a Configuración → Grapas.
                            </div>
                        ) : (
                            <select className="select select-bordered w-full" value={selectedGrapaId} onChange={e => setSelectedGrapaId(e.target.value)}>
                                <option value="">Seleccionar grapa...</option>
                                {grapas.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.nombre}{g.fabricante ? ` — ${g.fabricante}` : ''} ({formatCurrency(g.precioMetro)}/m)
                                    </option>
                                ))}
                            </select>
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

                <div className="flex gap-2 mt-4">
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
