'use client';
import { useState, useMemo } from 'react';
import { X, Search, Plus, ArrowRight } from 'lucide-react';
import { formatarProducto, generarCodigo } from '@/lib/producto-utils';

export default function ModalBusquedaProductos({ abierto, alCerrar, alSeleccionar, alCrearNuevo, items = [], busquedaInicial = '' }) {
    const [busqueda, setBusqueda] = useState(busquedaInicial);
    const [filtroMaterial, setFiltroMaterial] = useState('');
    const [filtroEspesor, setFiltroEspesor]   = useState('');
    const [filtroAcabado, setFiltroAcabado]   = useState('');
    const [soloConPrecio, setSoloConPrecio]   = useState(false);

    // Solo materiales con al menos un producto con precio activo
    const materiales = useMemo(() => {
        const conPrecio = items.filter(p => parseFloat(p.precioUnitario) > 0);
        return [...new Set(conPrecio.map(p => p.material?.nombre ?? p.material ?? null).filter(Boolean))].sort();
    }, [items]);

    // Espesores contextuales al material seleccionado
    const itemsDelMaterial = useMemo(() => {
        if (!filtroMaterial) return items;
        return items.filter(p => (p.material?.nombre ?? p.material) === filtroMaterial);
    }, [items, filtroMaterial]);

    const espesores = useMemo(() => {
        return [...new Set(itemsDelMaterial.map(p => p.espesor).filter(v => v != null))].sort((a, b) => a - b);
    }, [itemsDelMaterial]);

    // Acabados contextuales al material + espesor seleccionado (cascada)
    const acabados = useMemo(() => {
        const base = !filtroEspesor
            ? itemsDelMaterial
            : itemsDelMaterial.filter(p => String(p.espesor) === filtroEspesor);
        return [...new Set(base.map(p => p.acabado).filter(Boolean))].sort();
    }, [itemsDelMaterial, filtroEspesor]);

    const filtrados = useMemo(() => {
        const term = busqueda.toLowerCase().trim();
        return items.filter(p => {
            const matchTexto = !term ||
                p.nombre?.toLowerCase().includes(term) ||
                p.referenciaFabricante?.toLowerCase().includes(term) ||
                p.color?.toLowerCase().includes(term) ||
                p.acabado?.toLowerCase().includes(term) ||
                (p.material?.nombre ?? p.material ?? '').toLowerCase().includes(term) ||
                String(p.espesor ?? '').includes(term) ||
                String(p.ancho ?? '').includes(term) ||
                generarCodigo(p).toLowerCase().includes(term);
            const matchMaterial = !filtroMaterial || (p.material?.nombre ?? p.material) === filtroMaterial;
            const matchEspesor  = !filtroEspesor  || String(p.espesor) === filtroEspesor;
            const matchAcabado  = !filtroAcabado  || p.acabado === filtroAcabado;
            const matchPrecio   = !soloConPrecio  || (parseFloat(p.precioUnitario) > 0);
            return matchTexto && matchMaterial && matchEspesor && matchAcabado && matchPrecio;
        });
    }, [items, busqueda, filtroMaterial, filtroEspesor, filtroAcabado, soloConPrecio]);

    if (!abierto) return null;

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box w-11/12 max-w-5xl h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Search className="w-5 h-5" /> Buscar Producto
                    </h3>
                    <button onClick={alCerrar} className="btn btn-sm btn-circle btn-ghost"><X className="w-5 h-5" /></button>
                </div>

                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                        autoFocus
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Nombre, material, acabado, referencia, espesor..."
                        className="input input-bordered w-full pl-9"
                    />
                </div>

                <div className="flex flex-wrap gap-2 mb-3 items-center">
                    <select className="select select-bordered select-sm" value={filtroMaterial} onChange={e => { setFiltroMaterial(e.target.value); setFiltroEspesor(''); setFiltroAcabado(''); }}>
                        <option value="">Todos los materiales</option>
                        {materiales.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {espesores.length > 0 && (
                        <select className="select select-bordered select-sm" value={filtroEspesor} onChange={e => { setFiltroEspesor(e.target.value); setFiltroAcabado(''); }}>
                            <option value="">Todos los espesores</option>
                            {espesores.map(e => <option key={e} value={String(e)}>{e} mm</option>)}
                        </select>
                    )}
                    {acabados.length > 0 && (
                        <select className="select select-bordered select-sm" value={filtroAcabado} onChange={e => setFiltroAcabado(e.target.value)}>
                            <option value="">Todos los acabados</option>
                            {acabados.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" className="checkbox checkbox-sm" checked={soloConPrecio} onChange={e => setSoloConPrecio(e.target.checked)} />
                        Solo con precio
                    </label>
                    <span className="ml-auto text-xs text-base-content/40">
                        {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
                        {items.length > 0 && ` de ${items.length}`}
                    </span>
                </div>

                <div className="overflow-auto flex-1 border border-base-200 rounded-lg">
                    <table className="table table-pin-rows table-sm w-full">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Descripción</th>
                                <th>Espesor</th>
                                <th>Ancho</th>
                                <th>Largo</th>
                                <th className="text-right">Precio</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-base-content/40">No se encontraron productos.</td></tr>
                            ) : filtrados.map(p => (
                                <tr key={p.id} className="hover:bg-base-200 cursor-pointer" onClick={() => { alSeleccionar(p); alCerrar(); }}>
                                    <td className="font-medium max-w-[180px] truncate" title={p.nombre}>{p.nombre}</td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-xs">{formatarProducto(p)}</span>
                                            <div className="flex gap-1 flex-wrap">
                                                {p.color && <span className="badge badge-ghost badge-xs">{p.color}</span>}
                                                {p.subfamilia && (
                                                    <span className="badge badge-xs font-medium"
                                                        style={p.subfamilia.familia?.color ? {
                                                            backgroundColor: p.subfamilia.familia.color + '22',
                                                            color: p.subfamilia.familia.color,
                                                            borderColor: p.subfamilia.familia.color + '55',
                                                        } : {}}>
                                                        {p.subfamilia.nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-sm">{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                                    <td className="text-sm">{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                                    <td className="text-sm">{p.largo != null ? `${p.largo} mm` : '—'}</td>
                                    <td className="text-right font-mono font-medium text-primary">
                                        {p.precioUnitario != null && parseFloat(p.precioUnitario) > 0
                                            ? `${parseFloat(p.precioUnitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                            : <span className="text-base-content/30">—</span>
                                        }
                                    </td>
                                    <td><ArrowRight className="w-4 h-4 opacity-40" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 pt-3 border-t border-base-300 flex justify-between items-center">
                    {alCrearNuevo && (
                        <button type="button" onClick={() => alCrearNuevo(busqueda)} className="btn btn-sm btn-outline gap-2">
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
