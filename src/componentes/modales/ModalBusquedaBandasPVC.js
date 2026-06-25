'use client';
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, ArrowRight, Ruler, Plus, HelpCircle } from 'lucide-react';
import ModalCalculadoraBandas from './ModalCalculadoraBandas';

function getTipo(nombre) {
    if (!nombre) return '—';
    // Nomenclatura nueva: PVC-8mm-SF-AZ-...
    if (/-SF-/.test(nombre)) return 'Sin Fin';
    if (/-GR-/.test(nombre)) return 'Con Grapa';
    if (/-AB-/.test(nombre)) return 'Abierta';
    // Formato antiguo (compatibilidad)
    if (nombre.includes('Sin Fin')) return 'Sin Fin';
    if (nombre.includes('Con Grapa')) return 'Con Grapa';
    if (nombre.includes('Abierta')) return 'Abierta';
    return '—';
}

export default function ModalBusquedaBandasPVC({ isOpen, onClose, onSelect }) {
    const [search, setSearch] = useState('');
    const [filtroEspesor, setFiltroEspesor] = useState('');
    const [filtroColor, setFiltroColor] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [creandoBanda, setCreandoBanda] = useState(false);

    const { data: productos, mutate } = useSWR(isOpen ? '/api/productos' : null);

    const bandas = useMemo(() => {
        if (!productos) return [];
        const arr = Array.isArray(productos) ? productos : (productos.data ?? []);
        return arr.filter(p => p.referenciaFabricante === 'BANDA_PVC');
    }, [productos]);

    const espesores = useMemo(() =>
        [...new Set(bandas.map(b => b.espesor).filter(Boolean))].sort((a, b) => a - b),
    [bandas]);

    const colores = useMemo(() =>
        [...new Set(bandas.map(b => b.color).filter(Boolean))].sort(),
    [bandas]);

    const filtered = useMemo(() => {
        const term = search.toLowerCase();
        return bandas.filter(b => {
            const matchSearch = !search || b.nombre?.toLowerCase().includes(term) || b.color?.toLowerCase().includes(term);
            const matchEspesor = !filtroEspesor || String(b.espesor) === filtroEspesor;
            const matchColor = !filtroColor || b.color === filtroColor;
            const matchTipo = !filtroTipo || getTipo(b.nombre) === filtroTipo;
            return matchSearch && matchEspesor && matchColor && matchTipo;
        });
    }, [bandas, search, filtroEspesor, filtroColor, filtroTipo]);

    const handleBandaCreada = (bandaItem) => {
        // Cuando se crea una banda nueva desde la calculadora, se añade directamente al pedido
        setCreandoBanda(false);
        onSelect({
            // Adaptar formato de banda calculadora al formato de producto
            nombre: bandaItem.descripcion,
            precioUnitario: bandaItem.precioUnitario,
            pesoUnitario: bandaItem.pesoUnitario,
            id: null,
            _fromCalculadora: true,
            _bandaItem: bandaItem,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal modal-open z-40">
                <div className="modal-box w-11/12 max-w-5xl h-[85vh] flex flex-col">
                    {/* Cabecera */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Ruler className="w-5 h-5 text-secondary" /> Buscar Banda PVC
                        </h3>
                        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Filtros */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Ej: GR-NG, SF-AZ, TR40…"
                            className="input input-bordered input-sm w-full"
                            autoFocus
                        />
                        <select className="select select-bordered select-sm" value={filtroEspesor} onChange={e => setFiltroEspesor(e.target.value)}>
                            <option value="">Todos los espesores</option>
                            {espesores.map(e => <option key={e} value={String(e)}>{e} mm</option>)}
                        </select>
                        <select className="select select-bordered select-sm" value={filtroColor} onChange={e => setFiltroColor(e.target.value)}>
                            <option value="">Todos los colores</option>
                            {colores.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="select select-bordered select-sm" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                            <option value="">Todos los tipos</option>
                            <option value="Sin Fin">Sin Fin (SF)</option>
                            <option value="Con Grapa">Con Grapa (GR)</option>
                            <option value="Abierta">Abierta (AB)</option>
                        </select>
                    </div>

                    {/* Leyenda de nomenclatura */}
                    <div className="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-lg mb-3 text-xs">
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

                    {/* Contador de resultados */}
                    <p className="text-xs text-base-content/40 mb-2">
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
                                    <tr><td colSpan={9} className="text-center py-10 text-gray-500">
                                        No hay bandas guardadas. Crea una nueva con el botón de abajo.
                                    </td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-10 text-gray-500">
                                        No se encontraron bandas con esos filtros.
                                    </td></tr>
                                ) : filtered.map(b => (
                                    <tr key={b.id} className="hover:bg-base-200 cursor-pointer" onClick={() => { onSelect(b); onClose(); }}>
                                        <td className="font-bold max-w-xs truncate" title={b.nombre}>{b.nombre}</td>
                                        <td>{b.espesor != null ? `${b.espesor} mm` : '—'}</td>
                                        <td>{b.color || '—'}</td>
                                        <td><span className="badge badge-sm badge-ghost">{getTipo(b.nombre)}</span></td>
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

                    {/* Footer con botón crear */}
                    <div className="mt-4 pt-3 border-t border-base-300 flex justify-between items-center">
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

            {/* Calculadora de banda — se abre encima del modal de búsqueda */}
            <ModalCalculadoraBandas
                isOpen={creandoBanda}
                onClose={() => setCreandoBanda(false)}
                onAddItem={handleBandaCreada}
            />
        </>
    );
}
