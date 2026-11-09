"use client";
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { FileText, Plus, Trash2, Package, Calculator, ChevronRight, Users } from 'lucide-react';

const fetcher = url => fetch(url).then(r => r.json());
const fmtN = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v) || 0;
    return isFinite(n) ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
};

export default function PrefacturaPage() {
    // Step 1
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [pedidosSeleccionados, setPedidosSeleccionados] = useState(new Set());
    const [pedidosFull, setPedidosFull] = useState([]);
    const [cargando, setCargando] = useState(false);

    // Step 2
    const [palets, setPalets] = useState([{ id: 'p1', label: 'Palé 1', tipo: 'EUROPEO', altura: '', costePallex: null }]);
    const [asignaciones, setAsignaciones] = useState({});
    const [calculando, setCalculando] = useState({});
    const [provincia, setProvincia] = useState('');

    // Step 3
    const [generando, setGenerando] = useState('');

    // SWR — pedidos pendientes para derivar clientes únicos
    const { data: pedidosPendientesData } = useSWR('/api/pedidos?estado=Pendiente&limit=500', fetcher);
    // SWR — pedidos del cliente seleccionado
    const { data: pedidosClienteData } = useSWR(
        clienteSeleccionado ? `/api/pedidos?clientId=${clienteSeleccionado.id}&limit=50` : null,
        fetcher
    );

    // Clientes únicos con pedidos pendientes
    const clientesConPedidos = useMemo(() => {
        const pedidos = pedidosPendientesData?.data || [];
        const mapa = new Map();
        for (const p of pedidos) {
            if (!p.clienteId || !p.cliente) continue;
            const existing = mapa.get(p.clienteId);
            if (existing) {
                existing.numeroPedidos++;
                existing.totalPedidos += Number(p.total || 0);
            } else {
                mapa.set(p.clienteId, {
                    id: p.clienteId,
                    nombre: p.cliente.nombre,
                    numeroPedidos: 1,
                    totalPedidos: Number(p.total || 0),
                });
            }
        }
        return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [pedidosPendientesData]);

    const pedidosLista = pedidosClienteData?.data || [];

    // Pool de items de todos los pedidos seleccionados
    const itemsPool = useMemo(() =>
        pedidosFull.flatMap(pedido =>
            (pedido.items || []).map(item => ({
                key: `${pedido.id}::${item.id}`,
                pedidoId: pedido.id,
                pedidoNumero: pedido.numero,
                itemId: item.id,
                descripcion: item.descripcion || item.producto?.nombre || '',
                cantidad: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                pesoUnitario: Number(item.producto?.pesoUnitario) || 0,
            }))
        ),
        [pedidosFull]
    );

    // Helpers de asignación
    const getAsignado = (key, paletId) => Number(asignaciones[key]?.[paletId]) || 0;
    const getTotalAsignado = (key) => palets.reduce((s, p) => s + getAsignado(key, p.id), 0);
    const getSinAsignar = (item) => item.cantidad - getTotalAsignado(item.key);
    const getPaletPeso = (paletId) =>
        itemsPool.reduce((s, item) => s + getAsignado(item.key, paletId) * item.pesoUnitario, 0);
    const getPaletItems = (paletId) =>
        itemsPool
            .filter(item => getAsignado(item.key, paletId) > 0)
            .map(item => ({ ...item, cantidadPalet: getAsignado(item.key, paletId) }));

    const setAsignacion = (key, paletId, raw) => {
        const item = itemsPool.find(i => i.key === key);
        if (!item) return;
        const maxDisp = item.cantidad - getTotalAsignado(key) + getAsignado(key, paletId);
        const v = Math.max(0, Math.min(Number(raw) || 0, maxDisp));
        setAsignaciones(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [paletId]: v } }));
    };

    const addPalet = () => {
        const n = palets.length + 1;
        setPalets(prev => [...prev, { id: `p${Date.now()}`, label: `Palé ${n}`, tipo: 'EUROPEO', altura: '', costePallex: null }]);
    };

    const removePalet = (paletId) => {
        setPalets(prev => prev.filter(p => p.id !== paletId));
        setAsignaciones(prev => {
            const next = {};
            Object.keys(prev).forEach(k => { const a = { ...prev[k] }; delete a[paletId]; next[k] = a; });
            return next;
        });
    };

    const seleccionarCliente = (c) => {
        setClienteSeleccionado(c);
        setPedidosSeleccionados(new Set());
        setPedidosFull([]);
        setProvincia('');
        setAsignaciones({});
        setPalets([{ id: 'p1', label: 'Palé 1', tipo: 'EUROPEO', altura: '', costePallex: null }]);
    };

    const togglePedido = async (pedido) => {
        const newSet = new Set(pedidosSeleccionados);
        if (newSet.has(pedido.id)) {
            newSet.delete(pedido.id);
            setPedidosFull(prev => prev.filter(p => p.id !== pedido.id));
        } else {
            newSet.add(pedido.id);
            setCargando(true);
            try {
                const res = await fetch(`/api/pedidos/${pedido.id}`);
                const full = await res.json();
                setPedidosFull(prev => [...prev, full]);
            } finally {
                setCargando(false);
            }
        }
        setPedidosSeleccionados(newSet);
        setAsignaciones({});
    };

    const calcularPalet = async (paletId) => {
        const palet = palets.find(p => p.id === paletId);
        if (!palet?.altura || !provincia) return;
        setCalculando(prev => ({ ...prev, [paletId]: true }));
        try {
            const res = await fetch('/api/logistica/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provincia: provincia.toUpperCase(),
                    peso: getPaletPeso(paletId) || 1,
                    altura: parseFloat(palet.altura),
                    tipoPale: palet.tipo,
                }),
            });
            const data = await res.json();
            if (res.ok) setPalets(prev => prev.map(p => p.id === paletId ? { ...p, costePallex: data } : p));
        } finally {
            setCalculando(prev => ({ ...prev, [paletId]: false }));
        }
    };

    const generarPackingList = async (paletId) => {
        const palet = palets.find(p => p.id === paletId);
        const items = getPaletItems(paletId);
        if (!items.length) return;
        setGenerando(paletId);
        try {
            const res = await fetch('/api/prefactura/packing-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ palet: { label: palet.label, tipo: palet.tipo }, items, cliente: clienteSeleccionado }),
            });
            if (!res.ok) { alert('Error generando packing list'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `packing-list-${palet.label.replace(/\s/g, '-').toLowerCase()}.pdf`;
            a.click(); URL.revokeObjectURL(url);
        } finally { setGenerando(''); }
    };

    const generarPrefactura = async () => {
        setGenerando('prefactura');
        try {
            const res = await fetch('/api/prefactura', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clienteId: clienteSeleccionado.id,
                    pedidoIds: [...pedidosSeleccionados],
                    palets: palets.map(p => ({
                        label: p.label, tipo: p.tipo,
                        peso: getPaletPeso(p.id), costePallex: p.costePallex,
                    })),
                    provincia,
                }),
            });
            if (!res.ok) { alert('Error generando prefactura'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `prefactura-${(clienteSeleccionado.nombre || 'cliente').replace(/\s+/g, '-')}.pdf`;
            a.click(); URL.revokeObjectURL(url);
        } finally { setGenerando(''); }
    };

    // Totales
    const subtotalProductos = pedidosFull.reduce((s, p) => s + Number(p.subtotal || 0), 0);
    const totalEnvio = palets.reduce((s, p) => s + (Number(p.costePallex?.costeTotal) || 0), 0);
    const baseImponible = subtotalProductos + totalEnvio;
    const iva = baseImponible * 0.21;
    const totalFinal = baseImponible + iva;
    const todoAsignado = itemsPool.length > 0 && itemsPool.every(item => getSinAsignar(item) === 0);

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="flex items-center gap-3 mb-6">
                <FileText className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Prefactura</h1>
                    <p className="text-base-content/60 text-sm">Selecciona un cliente, elige sus pedidos pendientes y distribuye en palés</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Panel izquierdo — clientes con pedidos pendientes */}
                <div className="lg:col-span-1">
                    <div className="card bg-base-100 shadow">
                        <div className="card-body p-4">
                            <h2 className="font-semibold flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4" /> Clientes con pedidos
                            </h2>
                            {!pedidosPendientesData ? (
                                <div className="flex justify-center py-6"><span className="loading loading-spinner loading-sm" /></div>
                            ) : clientesConPedidos.length === 0 ? (
                                <p className="text-sm text-base-content/40 text-center py-4">No hay pedidos pendientes</p>
                            ) : (
                                <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
                                    {clientesConPedidos.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => seleccionarCliente(c)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${clienteSeleccionado?.id === c.id ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
                                        >
                                            <div className="font-medium text-sm">{c.nombre}</div>
                                            <div className={`text-xs mt-0.5 ${clienteSeleccionado?.id === c.id ? 'text-primary-content/70' : 'text-base-content/50'}`}>
                                                {c.numeroPedidos} pedido{c.numeroPedidos > 1 ? 's' : ''} · {fmtN(c.totalPedidos)} €
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel derecho — contenido */}
                <div className="lg:col-span-2 space-y-4">
                    {!clienteSeleccionado ? (
                        <div className="card bg-base-100 shadow">
                            <div className="card-body items-center justify-center py-16 text-base-content/30">
                                <Users className="w-12 h-12 mb-3" />
                                <p>Selecciona un cliente</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: Pedidos del cliente */}
                            <div className="card bg-base-100 shadow">
                                <div className="card-body p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="font-semibold">Pedidos de {clienteSeleccionado.nombre}</h2>
                                        {pedidosSeleccionados.size > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-base-content/60">Provincia (Pallex):</span>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: JAÉN"
                                                    className="input input-bordered input-xs w-28 uppercase"
                                                    value={provincia}
                                                    onChange={e => setProvincia(e.target.value.toUpperCase())}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {pedidosLista.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {pedidosLista.map(p => (
                                                <label key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${pedidosSeleccionados.has(p.id) ? 'border-primary bg-primary/10 font-medium' : 'border-base-200 hover:bg-base-200'}`}>
                                                    <input type="checkbox" className="checkbox checkbox-xs checkbox-primary" checked={pedidosSeleccionados.has(p.id)} onChange={() => togglePedido(p)} disabled={cargando} />
                                                    <span className="font-mono">{p.numero}</span>
                                                    <span className="text-base-content/60">{fmtN(p.total)} €</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-base-content/40">Cargando pedidos…</span>
                                    )}
                                    {cargando && <span className="loading loading-spinner loading-xs ml-2" />}
                                </div>
                            </div>

                            {/* PASO 2: Distribución en palés */}
                            {itemsPool.length > 0 && (
                                <div className="card bg-base-100 shadow">
                                    <div className="card-body p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h2 className="font-semibold flex items-center gap-2">
                                                <Package className="w-4 h-4" /> Distribución en palés
                                                {todoAsignado && <span className="badge badge-success badge-sm ml-2">Todo asignado ✓</span>}
                                            </h2>
                                            <button onClick={addPalet} className="btn btn-sm btn-ghost gap-1">
                                                <Plus className="w-4 h-4" /> Añadir palé
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="table table-xs w-full border border-base-200 rounded-lg">
                                                <thead>
                                                    <tr className="bg-base-200">
                                                        <th className="min-w-48">Artículo</th>
                                                        <th className="w-28 text-center">Pedido</th>
                                                        <th className="w-12 text-center">Total</th>
                                                        {palets.map(p => (
                                                            <th key={p.id} className="w-20 text-center bg-primary/5">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {p.label}
                                                                    {palets.length > 1 && (
                                                                        <button onClick={() => removePalet(p.id)} className="text-error opacity-40 hover:opacity-100">
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th className="w-12 text-center">Resto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {itemsPool.map(item => {
                                                        const resto = getSinAsignar(item);
                                                        return (
                                                            <tr key={item.key} className="hover">
                                                                <td><span className="text-xs line-clamp-2">{item.descripcion}</span></td>
                                                                <td className="text-center"><span className="font-mono text-xs text-base-content/50">{item.pedidoNumero}</span></td>
                                                                <td className="text-center font-semibold text-sm">{item.cantidad}</td>
                                                                {palets.map(p => (
                                                                    <td key={p.id} className="text-center bg-primary/[0.02]">
                                                                        <input
                                                                            type="number" min="0" max={item.cantidad}
                                                                            value={getAsignado(item.key, p.id) || ''}
                                                                            onChange={e => setAsignacion(item.key, p.id, e.target.value)}
                                                                            className="input input-xs input-bordered w-14 text-center"
                                                                            placeholder="0"
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className={`text-center font-semibold text-sm ${resto > 0 ? 'text-warning' : 'text-success'}`}>{resto}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="border-t-2 border-base-300">
                                                    <tr className="bg-base-50">
                                                        <td colSpan={3} className="text-xs font-semibold text-base-content/60 py-2">Peso aprox.</td>
                                                        {palets.map(p => <td key={p.id} className="text-center text-xs font-semibold">{fmtN(getPaletPeso(p.id))} kg</td>)}
                                                        <td />
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={3} className="text-xs text-base-content/60">Tipo</td>
                                                        {palets.map(p => (
                                                            <td key={p.id}>
                                                                <select className="select select-xs select-bordered w-full" value={p.tipo}
                                                                    onChange={e => setPalets(prev => prev.map(x => x.id === p.id ? { ...x, tipo: e.target.value, costePallex: null } : x))}>
                                                                    <option value="EUROPEO">Europeo</option>
                                                                    <option value="MEDIO">Medio</option>
                                                                </select>
                                                            </td>
                                                        ))}
                                                        <td />
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={3} className="text-xs text-base-content/60">Altura (cm)</td>
                                                        {palets.map(p => (
                                                            <td key={p.id}>
                                                                <input type="number" placeholder="cm" value={p.altura}
                                                                    onChange={e => setPalets(prev => prev.map(x => x.id === p.id ? { ...x, altura: e.target.value, costePallex: null } : x))}
                                                                    className="input input-xs input-bordered w-full" />
                                                            </td>
                                                        ))}
                                                        <td />
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={3} className="text-xs text-base-content/60">Coste Pallex</td>
                                                        {palets.map(p => (
                                                            <td key={p.id} className="text-center py-1">
                                                                {p.costePallex ? (
                                                                    <div>
                                                                        <div className="text-xs font-bold text-success">{fmtN(p.costePallex.costeTotal)} €</div>
                                                                        <div className="text-xs text-base-content/40">{p.costePallex.tipologia}</div>
                                                                        <button onClick={() => calcularPalet(p.id)} className="btn btn-xs btn-ghost mt-0.5">↺</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => calcularPalet(p.id)} disabled={!p.altura || !provincia || calculando[p.id]} className="btn btn-xs btn-secondary gap-1">
                                                                        {calculando[p.id] ? <span className="loading loading-spinner loading-xs" /> : <><Calculator className="w-3 h-3" /> Calc</>}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td />
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={3} className="text-xs text-base-content/60">Packing list</td>
                                                        {palets.map(p => (
                                                            <td key={p.id} className="text-center py-1">
                                                                <button onClick={() => generarPackingList(p.id)} disabled={!getPaletItems(p.id).length || generando === p.id} className="btn btn-xs btn-outline gap-1">
                                                                    {generando === p.id ? <span className="loading loading-spinner loading-xs" /> : <FileText className="w-3 h-3" />} PDF
                                                                </button>
                                                            </td>
                                                        ))}
                                                        <td />
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PASO 3: Resumen + Generar */}
                            {itemsPool.length > 0 && (
                                <div className="card bg-base-100 shadow">
                                    <div className="card-body p-4">
                                        <h2 className="font-semibold flex items-center gap-2 mb-4">
                                            <ChevronRight className="w-4 h-4" /> Resumen y generar prefactura
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-sm font-medium mb-2">Desglose por palé:</p>
                                                <div className="space-y-1">
                                                    {palets.map(p => (
                                                        <div key={p.id} className="flex justify-between text-sm">
                                                            <span className="text-base-content/60">{p.label} — {p.tipo}{p.altura ? `, ${p.altura} cm` : ''}, {fmtN(getPaletPeso(p.id))} kg</span>
                                                            <span className="font-medium">{p.costePallex ? `${fmtN(p.costePallex.costeTotal)} €` : '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                {pedidosFull.map(p => (
                                                    <div key={p.id} className="flex justify-between text-xs text-base-content/50">
                                                        <span>{p.numero}</span><span>{fmtN(p.subtotal)} €</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between font-medium border-t border-base-200 pt-1 mt-1">
                                                    <span>Subtotal productos</span><span>{fmtN(subtotalProductos)} €</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-base-content/60">Total envío ({palets.length} palé{palets.length > 1 ? 's' : ''})</span>
                                                    <span>{fmtN(totalEnvio)} €</span>
                                                </div>
                                                <div className="divider my-1" />
                                                <div className="flex justify-between">
                                                    <span className="text-base-content/60">Base imponible</span><span>{fmtN(baseImponible)} €</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-base-content/60">IVA 21%</span><span>{fmtN(iva)} €</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-base pt-1">
                                                    <span>TOTAL</span><span className="text-primary">{fmtN(totalFinal)} €</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={generarPrefactura} disabled={generando === 'prefactura' || !pedidosSeleccionados.size} className="btn btn-primary w-full mt-4 gap-2">
                                            <FileText className="w-4 h-4" />
                                            {generando === 'prefactura' ? 'Generando PDF…' : `Generar Prefactura (${pedidosSeleccionados.size} pedido${pedidosSeleccionados.size > 1 ? 's' : ''})`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
