'use client';
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { X, ArrowRight, Ruler } from 'lucide-react';

function getTipo(nombre) {
    if (nombre?.includes('Sin Fin')) return 'Sin Fin';
    if (nombre?.includes('Con Grapa')) return 'Con Grapa';
    if (nombre?.includes('Abierta')) return 'Abierta';
    return '—';
}

export default function ModalBusquedaBandasPVC({ isOpen, onClose, onSelect }) {
    const [search, setSearch] = useState('');
    const [filtroEspesor, setFiltroEspesor] = useState('');
    const [filtroColor, setFiltroColor] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');

    const { data: productos } = useSWR('/api/productos');

    const bandas = useMemo(() => {
        if (!productos) return [];
        return productos.filter(p => p.referenciaFabricante === 'BANDA_PVC');
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

    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-secondary" /> Bandas PVC Guardadas
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre..."
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
                        <option value="Sin Fin">Sin Fin</option>
                        <option value="Con Grapa">Con Grapa</option>
                        <option value="Abierta">Abierta</option>
                    </select>
                </div>

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
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {bandas.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-500">
                                    No hay bandas guardadas. Usa el icono 🔖 en la calculadora para guardar una banda.
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-500">
                                    No se encontraron bandas con esos filtros.
                                </td></tr>
                            ) : filtered.map(b => (
                                <tr key={b.id} className="hover:bg-base-200 cursor-pointer" onClick={() => { onSelect(b); onClose(); }}>
                                    <td className="font-bold max-w-xs truncate">{b.nombre}</td>
                                    <td>{b.espesor != null ? `${b.espesor} mm` : '—'}</td>
                                    <td>{b.color || '—'}</td>
                                    <td><span className="badge badge-sm badge-ghost">{getTipo(b.nombre)}</span></td>
                                    <td>{b.ancho != null ? `${b.ancho} mm` : '—'}</td>
                                    <td>{b.largo != null ? `${b.largo} mm` : '—'}</td>
                                    <td className="text-right font-mono">{(b.precioUnitario ?? 0).toFixed(2)} €</td>
                                    <td><button className="btn btn-xs btn-ghost"><ArrowRight className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="modal-action mt-4">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
