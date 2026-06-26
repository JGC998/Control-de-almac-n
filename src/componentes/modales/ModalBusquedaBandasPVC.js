'use client';
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, ArrowRight, Ruler, Plus, HelpCircle, FilterX } from 'lucide-react';
import ModalCalculadoraBandas from './ModalCalculadoraBandas';

// ─── Helpers de parseo del nombre de nomenclatura ───────────────────────────

function parseConf(nombre) {
    if (!nombre) return null;
    if (/-SF-/.test(nombre) || nombre.includes('Sin Fin')) return 'SF';
    if (/-GR-/.test(nombre) || nombre.includes('Con Grapa')) return 'GR';
    if (/-AB-/.test(nombre) || nombre.includes('Abierta')) return 'AB';
    return null;
}

function parseTacos(nombre) {
    if (!nombre) return null;
    const m = nombre.match(/-T([RI])(\d+)/);
    return m ? { tipo: m[1], altura: parseInt(m[2], 10) } : null;
}

const CONF_LABEL = { SF: 'Sin Fin (SF)', GR: 'Con Grapa (GR)', AB: 'Abierta (AB)' };
const TACO_LABEL = { R: 'Rectos (TR)', I: 'Inclinados (TI)' };

// ─── Filtros en cascada ───────────────────────────────────────────────────────

function useCascade(bandas) {
    const [filtroEspesor,   setFiltroEspesorRaw]   = useState('');
    const [filtroColor,     setFiltroColorRaw]      = useState('');
    const [filtroConf,      setFiltroConfRaw]       = useState('');
    const [filtroTacos,     setFiltroTacosRaw]      = useState(''); // 'si' | 'no' | ''
    const [filtroTipoTaco,  setFiltroTipoTacoRaw]   = useState('');
    const [filtroAncho,     setFiltroAnchoRaw]      = useState('');
    const [filtroLargo,     setFiltroLargoRaw]      = useState('');

    // Cada setter resetea los filtros downstream
    const setFiltroEspesor = v => { setFiltroEspesorRaw(v); setFiltroColorRaw(''); setFiltroConfRaw(''); setFiltroTacosRaw(''); setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
    const setFiltroColor   = v => { setFiltroColorRaw(v);   setFiltroConfRaw(''); setFiltroTacosRaw(''); setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
    const setFiltroConf    = v => { setFiltroConfRaw(v);    setFiltroTacosRaw(''); setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
    const setFiltroTacos   = v => { setFiltroTacosRaw(v);   setFiltroTipoTacoRaw(''); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
    const setFiltroTipoTaco= v => { setFiltroTipoTacoRaw(v); setFiltroAnchoRaw(''); setFiltroLargoRaw(''); };
    const setFiltroAncho   = v => { setFiltroAnchoRaw(v);   setFiltroLargoRaw(''); };
    const setFiltroLargo   = v => { setFiltroLargoRaw(v); };

    const resetAll = () => { setFiltroEspesor(''); };

    // ─── Conjuntos progresivos ────────────────────────────────────────────────

    // Nivel 0 → espesores disponibles (de todo el catálogo)
    const espsDisp = useMemo(() =>
        [...new Set(bandas.map(b => b.espesor).filter(v => v != null))].sort((a, b) => a - b),
    [bandas]);

    // Nivel 1 → filtrado por espesor
    const b1 = useMemo(() =>
        filtroEspesor ? bandas.filter(b => String(b.espesor) === filtroEspesor) : bandas,
    [bandas, filtroEspesor]);

    const colsDisp = useMemo(() =>
        [...new Set(b1.map(b => b.color).filter(Boolean))].sort(),
    [b1]);

    // Nivel 2 → filtrado por color
    const b2 = useMemo(() =>
        filtroColor ? b1.filter(b => b.color === filtroColor) : b1,
    [b1, filtroColor]);

    const confsDisp = useMemo(() =>
        [...new Set(b2.map(b => parseConf(b.nombre)).filter(Boolean))].sort(),
    [b2]);

    // Nivel 3 → filtrado por confección
    const b3 = useMemo(() =>
        filtroConf ? b2.filter(b => parseConf(b.nombre) === filtroConf) : b2,
    [b2, filtroConf]);

    const { hayConTacos, haySinTacos } = useMemo(() => ({
        hayConTacos:  b3.some(b => !!parseTacos(b.nombre)),
        haySinTacos:  b3.some(b => !parseTacos(b.nombre)),
    }), [b3]);

    // Nivel 4 → filtrado por tacos
    const b4 = useMemo(() => {
        if (!filtroTacos) return b3;
        return b3.filter(b => filtroTacos === 'si' ? !!parseTacos(b.nombre) : !parseTacos(b.nombre));
    }, [b3, filtroTacos]);

    const tiposTacosDisp = useMemo(() =>
        [...new Set(b4.map(b => parseTacos(b.nombre)?.tipo).filter(Boolean))].sort(),
    [b4]);

    // Nivel 5 → filtrado por tipo de taco
    const b5 = useMemo(() =>
        filtroTipoTaco ? b4.filter(b => parseTacos(b.nombre)?.tipo === filtroTipoTaco) : b4,
    [b4, filtroTipoTaco]);

    const anchosDisp = useMemo(() =>
        [...new Set(b5.map(b => b.ancho).filter(v => v != null))].sort((a, b) => a - b),
    [b5]);

    // Nivel 6 → filtrado por ancho
    const b6 = useMemo(() =>
        filtroAncho ? b5.filter(b => String(b.ancho) === filtroAncho) : b5,
    [b5, filtroAncho]);

    const largosDisp = useMemo(() =>
        [...new Set(b6.map(b => b.largo).filter(v => v != null))].sort((a, b) => a - b),
    [b6]);

    // Nivel 7 → filtrado por largo → resultado final de la cascada
    const resultado = useMemo(() =>
        filtroLargo ? b6.filter(b => String(b.largo) === filtroLargo) : b6,
    [b6, filtroLargo]);

    const hayFiltrosActivos = !!(filtroEspesor || filtroColor || filtroConf || filtroTacos || filtroTipoTaco || filtroAncho || filtroLargo);

    return {
        // valores
        filtroEspesor, filtroColor, filtroConf, filtroTacos, filtroTipoTaco, filtroAncho, filtroLargo,
        // setters en cascada
        setFiltroEspesor, setFiltroColor, setFiltroConf, setFiltroTacos, setFiltroTipoTaco, setFiltroAncho, setFiltroLargo,
        // opciones disponibles para cada select
        espsDisp, colsDisp, confsDisp, hayConTacos, haySinTacos, tiposTacosDisp, anchosDisp, largosDisp,
        // resultado parcial (antes del text search)
        resultado,
        resetAll,
        hayFiltrosActivos,
    };
}

// ─── Modal principal ─────────────────────────────────────────────────────────

export default function ModalBusquedaBandasPVC({ isOpen, onClose, onSelect }) {
    const [search, setSearch] = useState('');
    const [creandoBanda, setCreandoBanda] = useState(false);

    const { data: productos, mutate } = useSWR(isOpen ? '/api/productos' : null);

    const bandas = useMemo(() => {
        if (!productos) return [];
        const arr = Array.isArray(productos) ? productos : (productos.data ?? []);
        return arr.filter(p => p.referenciaFabricante === 'BANDA_PVC');
    }, [productos]);

    const cascade = useCascade(bandas);

    // Búsqueda de texto sobre el resultado de la cascada
    const filtered = useMemo(() => {
        if (!search.trim()) return cascade.resultado;
        const term = search.toLowerCase();
        return cascade.resultado.filter(b => b.nombre?.toLowerCase().includes(term));
    }, [cascade.resultado, search]);

    const handleBandaCreada = (bandaItem) => {
        setCreandoBanda(false);
        onSelect({
            nombre: bandaItem.descripcion,
            precioUnitario: bandaItem.precioUnitario,
            pesoUnitario: bandaItem.pesoUnitario,
            id: null,
            _fromCalculadora: true,
            _bandaItem: bandaItem,
        });
        onClose();
    };

    const handleReset = () => {
        cascade.resetAll();
        setSearch('');
    };

    if (!isOpen) return null;

    const mostrarTacos   = !!cascade.filtroConf; // solo si ya hay confección elegida
    const mostrarTipoTaco= cascade.filtroTacos === 'si';

    return (
        <>
            <div className="modal modal-open z-40">
                <div className="modal-box w-11/12 max-w-5xl h-[90vh] flex flex-col gap-3">

                    {/* Cabecera */}
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Ruler className="w-5 h-5 text-secondary" /> Buscar Banda PVC
                        </h3>
                        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                    </div>

                    {/* ─── Filtros en cascada ─────────────────────────────── */}
                    <div className="bg-base-200 rounded-xl p-3 space-y-2">
                        {/* Fila 1: espesor · color · confección */}
                        <div className="grid grid-cols-3 gap-2">
                            <FiltroSelect
                                label="Espesor"
                                value={cascade.filtroEspesor}
                                onChange={cascade.setFiltroEspesor}
                                placeholder="Todos"
                                options={cascade.espsDisp.map(e => ({ value: String(e), label: `${e} mm` }))}
                            />
                            <FiltroSelect
                                label="Color"
                                value={cascade.filtroColor}
                                onChange={cascade.setFiltroColor}
                                placeholder={cascade.filtroEspesor ? 'Todos' : '— elige espesor primero —'}
                                disabled={!cascade.filtroEspesor || cascade.colsDisp.length === 0}
                                options={cascade.colsDisp.map(c => ({ value: c, label: c }))}
                            />
                            <FiltroSelect
                                label="Confección"
                                value={cascade.filtroConf}
                                onChange={cascade.setFiltroConf}
                                placeholder={cascade.filtroColor ? 'Todos' : '— elige color primero —'}
                                disabled={!cascade.filtroColor || cascade.confsDisp.length === 0}
                                options={cascade.confsDisp.map(c => ({ value: c, label: CONF_LABEL[c] ?? c }))}
                            />
                        </div>

                        {/* Fila 2: tacos · tipo taco · ancho · largo */}
                        <div className="grid grid-cols-4 gap-2">
                            <FiltroSelect
                                label="¿Lleva tacos?"
                                value={cascade.filtroTacos}
                                onChange={cascade.setFiltroTacos}
                                placeholder={mostrarTacos ? 'Indiferente' : '— elige confección —'}
                                disabled={!mostrarTacos}
                                options={[
                                    ...(cascade.hayConTacos  ? [{ value: 'si', label: 'Con tacos' }]   : []),
                                    ...(cascade.haySinTacos  ? [{ value: 'no', label: 'Sin tacos' }]   : []),
                                ]}
                            />
                            <FiltroSelect
                                label="Tipo de taco"
                                value={cascade.filtroTipoTaco}
                                onChange={cascade.setFiltroTipoTaco}
                                placeholder={mostrarTipoTaco ? 'Todos' : '— elige "Con tacos" —'}
                                disabled={!mostrarTipoTaco || cascade.tiposTacosDisp.length === 0}
                                options={cascade.tiposTacosDisp.map(t => ({ value: t, label: TACO_LABEL[t] ?? t }))}
                            />
                            <FiltroSelect
                                label="Ancho (mm)"
                                value={cascade.filtroAncho}
                                onChange={cascade.setFiltroAncho}
                                placeholder={cascade.filtroConf ? 'Todos' : '— elige confección —'}
                                disabled={!cascade.filtroConf || cascade.anchosDisp.length === 0}
                                options={cascade.anchosDisp.map(a => ({ value: String(a), label: `${a} mm` }))}
                            />
                            <FiltroSelect
                                label="Largo (mm)"
                                value={cascade.filtroLargo}
                                onChange={cascade.setFiltroLargo}
                                placeholder={cascade.filtroAncho ? 'Todos' : '— elige ancho —'}
                                disabled={!cascade.filtroAncho || cascade.largosDisp.length === 0}
                                options={cascade.largosDisp.map(l => ({ value: String(l), label: `${l} mm` }))}
                            />
                        </div>

                        {/* Búsqueda de texto + limpiar */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar en nombre… (ej: GR-NG, TR40)"
                                className="input input-bordered input-sm flex-1"
                            />
                            {(cascade.hayFiltrosActivos || search) && (
                                <button
                                    className="btn btn-sm btn-ghost gap-1"
                                    onClick={handleReset}
                                    title="Limpiar todos los filtros"
                                >
                                    <FilterX className="w-4 h-4" /> Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Leyenda */}
                    <div className="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-lg text-xs">
                        <input type="checkbox" className="min-h-0" />
                        <div className="collapse-title min-h-0 py-2 font-semibold flex items-center gap-1.5 text-base-content/60">
                            <HelpCircle className="w-3.5 h-3.5" /> Leyenda — cómo leer los códigos
                        </div>
                        <div className="collapse-content pb-3">
                            <p className="font-mono text-base-content/40 mb-2">PVC-[ESP]mm-[CONF]-[COLOR]-[A]x[L][-T[TIPO][mm]]</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                                <div><span className="font-mono font-bold">SF</span> = Sin Fin (vulcanizado)</div>
                                <div><span className="font-mono font-bold">GR</span> = Con Grapa</div>
                                <div><span className="font-mono font-bold">AB</span> = Abierta</div>
                                <div><span className="font-mono font-bold">AZ</span> = Azul</div>
                                <div><span className="font-mono font-bold">BL</span> = Blanco</div>
                                <div><span className="font-mono font-bold">NG</span> = Negro</div>
                                <div><span className="font-mono font-bold">VD</span> = Verde</div>
                                <div><span className="font-mono font-bold">TR40</span> = Tacos Rectos 40mm</div>
                                <div><span className="font-mono font-bold">TI35</span> = Tacos Inclinados 35mm</div>
                            </div>
                            <p className="text-base-content/40 mt-2">Ejemplo: <span className="font-mono">PVC-8mm-GR-NG-800x10000-TR40</span> → PVC 8mm, Con Grapa, Negro, 800×10000mm, Tacos Rectos 40mm</p>
                        </div>
                    </div>

                    {/* Contador */}
                    <p className="text-xs text-base-content/40">
                        {filtered.length} banda{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
                        {bandas.length > 0 && ` de ${bandas.length} en total`}
                    </p>

                    {/* Tabla */}
                    <div className="overflow-auto flex-1 bg-base-100 border rounded-lg">
                        <table className="table table-pin-rows table-sm w-full">
                            <thead>
                                <tr>
                                    <th>Nombre / Referencia</th>
                                    <th>Espesor</th>
                                    <th>Color</th>
                                    <th>Tipo</th>
                                    <th>Ancho</th>
                                    <th>Largo</th>
                                    <th className="text-right">Precio unit.</th>
                                    <th className="text-right">Peso</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {bandas.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-10 text-base-content/40">
                                        No hay bandas guardadas. Crea una nueva con el botón de abajo.
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-10 text-base-content/40">
                                        No se encontraron bandas con esos filtros.
                                    </td></tr>
                                ) : filtered.map(b => (
                                    <tr key={b.id} className="hover:bg-base-200 cursor-pointer" onClick={() => { onSelect(b); onClose(); }}>
                                        <td className="font-bold max-w-xs truncate font-mono text-xs" title={b.nombre}>{b.nombre}</td>
                                        <td>{b.espesor != null ? `${b.espesor} mm` : '—'}</td>
                                        <td>{b.color || '—'}</td>
                                        <td><span className="badge badge-sm badge-ghost">{CONF_LABEL[parseConf(b.nombre)] ?? '—'}</span></td>
                                        <td>{b.ancho != null ? `${b.ancho} mm` : '—'}</td>
                                        <td>{b.largo != null ? `${b.largo} mm` : '—'}</td>
                                        <td className="text-right font-mono">{(b.precioUnitario ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                        <td className="text-right">{b.pesoUnitario != null ? `${Number(b.pesoUnitario).toFixed(3)} kg` : '—'}</td>
                                        <td><button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-base-300 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setCreandoBanda(true)}
                            className="btn btn-sm btn-accent gap-2"
                        >
                            <Plus className="w-4 h-4" /> Crear Banda PVC nueva
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={onClose}>Cerrar</button>
                    </div>
                </div>
                <div className="modal-backdrop" onClick={onClose} />
            </div>

            <ModalCalculadoraBandas
                isOpen={creandoBanda}
                onClose={() => setCreandoBanda(false)}
                onAddItem={handleBandaCreada}
            />
        </>
    );
}

// ─── Sub-componente: select con label flotante ────────────────────────────────

function FiltroSelect({ label, value, onChange, options, placeholder = 'Todos', disabled = false }) {
    return (
        <div className="flex flex-col gap-0.5">
            <label className="text-xs font-medium text-base-content/50 pl-1">{label}</label>
            <select
                className="select select-bordered select-sm w-full"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">{placeholder}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}
