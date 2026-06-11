'use client';
import { useState, useMemo } from 'react';
import { X, Search, Plus, ArrowRight } from 'lucide-react';

export default function ModalBusquedaProductos({ abierto, alCerrar, alSeleccionar, alCrearNuevo, items = [], busquedaInicial = '' }) {
    const [busqueda, setBusqueda] = useState(busquedaInicial);
    const [filtroMaterial, setFiltroMaterial] = useState('');
    const [filtroEspesor, setFiltroEspesor] = useState('');
    const [soloConPrecio, setSoloConPrecio] = useState(false);

    // Opciones únicas para filtros
    const materiales = useMemo(() => {
        const vals = [...new Set(items.map(p => p.material?.nombre ?? p.material ?? null).filter(Boolean))].sort();
        return vals;
    }, [items]);

    const espesores = useMemo(() => {
        const vals = [...new Set(items.map(p => p.espesor).filter(v => v != null))].sort((a, b) => a - b);
        return vals;
    }, [items]);

    const filtrados = useMemo(() => {
        const term = busqueda.toLowerCase().trim();
        return items.filter(p => {
            const matchTexto = !term ||
                p.nombre?.toLowerCase().includes(term) ||
                p.referenciaFabricante?.toLowerCase().includes(term) ||
                p.color?.toLowerCase().includes(term) ||
                String(p.espesor ?? '').includes(term) ||
                String(p.ancho ?? '').includes(term);
            const matchMaterial = !filtroMaterial || (p.material?.nombre ?? p.material) === filtroMaterial;
            const matchEspesor = !filtroEspesor || String(p.espesor) === filtroEspesor;
            const matchPrecio = !soloConPrecio || (parseFloat(p.precioUnitario) > 0);
            return matchTexto && matchMaterial && matchEspesor && matchPrecio;
        });
    }, [items, busqueda, filtroMaterial, filtroEspesor, soloConPrecio]);

    if (!abierto) return null;

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box w-11/12 max-w-4xl h-[85vh] flex flex-col">
                {/* Cabecera */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" /> Buscar Producto
                    </h3>
                    <button onClick={alCerrar} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                {/* Búsqueda principal */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                        autoFocus
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Nombre, color, referencia fabricante, espesor, ancho..."
                        className="input input-bordered w-full pl-9"
                    />
                </div>

                {/* Filtros secundarios */}
                <div className="flex flex-wrap gap-2 mb-3 items-center">
                    <select
                        className="select select-bordered select-sm"
                        value={filtroMaterial}
                        onChange={e => setFiltroMaterial(e.target.value)}
                    >
                        <option value="">Todos los materiales</option>
                        {materiales.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        className="select select-bordered select-sm"
                        value={filtroEspesor}
                        onChange={e => setFiltroEspesor(e.target.value)}
                    >
                        <option value="">Todos los espesores</option>
                        {espesores.map(e => <option key={e} value={String(e)}>{e} mm</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={soloConPrecio}
                            onChange={e => setSoloConPrecio(e.target.checked)}
                        />
                        Solo con precio
                    </label>
                    <span className="ml-auto text-xs text-base-content/40">
                        {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
                        {items.length > 0 && ` de ${items.length}`}
                    </span>
                </div>

                {/* Tabla de resultados */}
                <div className="overflow-auto flex-1 border border-base-200 rounded-lg">
                    <table className="table table-pin-rows table-sm w-full">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Material</th>
                                <th>Espesor</th>
                                <th>Ancho</th>
                                <th>Largo</th>
                                <th>Color</th>
                                <th className="text-right">Precio</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-10 text-base-content/40">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            ) : filtrados.map(p => (
                                <tr
                                    key={p.id}
                                    className="hover:bg-base-200 cursor-pointer"
                                    onClick={() => { alSeleccionar(p); alCerrar(); }}
                                >
                                    <td className="font-medium max-w-[200px] truncate" title={p.nombre}>{p.nombre}</td>
                                    <td className="text-xs">{p.material?.nombre ?? p.material ?? '—'}</td>
                                    <td>{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                                    <td>{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                                    <td>{p.largo != null ? `${p.largo} mm` : '—'}</td>
                                    <td>{p.color || '—'}</td>
                                    <td className="text-right font-mono font-medium text-primary">
                                        {p.precioUnitario != null && parseFloat(p.precioUnitario) > 0
                                            ? `${parseFloat(p.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                                            : <span className="text-base-content/30">—</span>
                                        }
                                    </td>
                                    <td><ArrowRight className="w-4 h-4 opacity-40" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-base-300 flex justify-between items-center">
                    {alCrearNuevo && (
                        <button
                            type="button"
                            onClick={() => alCrearNuevo(busqueda)}
                            className="btn btn-sm btn-outline gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Producto{busqueda ? ` "${busqueda}"` : ''}
                        </button>
                    )}
                    <button className="btn btn-sm btn-ghost ml-auto" onClick={alCerrar}>Cerrar</button>
                </div>
            </div>
            <div className="modal-backdrop" onClick={alCerrar} />
        </div>
    );
}
