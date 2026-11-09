"use client";
import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { FileText, Search, Truck, Package, ArrowRight, Calculator } from 'lucide-react';

const fetcher = url => fetch(url).then(r => r.json());

const fmtN = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v) || 0;
    return isFinite(n) ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';
};

export default function PrefacturaPage() {
    const [search, setSearch] = useState('');
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [agencia, setAgencia] = useState('Pallex');
    const [tipoPale, setTipoPale] = useState('EUROPEO');
    const [provincia, setProvincia] = useState('');
    const [altura, setAltura] = useState('');
    const [costeManual, setCosteManual] = useState('');
    const [costesCalculados, setCostesCalculados] = useState(null);
    const [calculando, setCalculando] = useState(false);
    const [generando, setGenerando] = useState(false);
    const [errorCalculo, setErrorCalculo] = useState('');

    const [cargandoPedido, setCargandoPedido] = useState(false);

    const { data: pedidosData } = useSWR('/api/pedidos?limit=100', fetcher);

    const pedidosFiltrados = useMemo(() => {
        const lista = pedidosData?.data || [];
        if (!search) return lista.slice(0, 30);
        const q = search.toLowerCase();
        return lista.filter(p =>
            p.numero?.toLowerCase().includes(q) ||
            p.cliente?.nombre?.toLowerCase().includes(q)
        ).slice(0, 30);
    }, [pedidosData, search]);

    const seleccionarPedido = async (p) => {
        setCargandoPedido(true);
        setCostesCalculados(null);
        setCosteManual('');
        setErrorCalculo('');
        try {
            const res = await fetch(`/api/pedidos/${p.id}`);
            const full = await res.json();
            setPedidoSeleccionado(full);
            if (full.cliente?.poblacion) setProvincia(full.cliente.poblacion);
        } finally {
            setCargandoPedido(false);
        }
    };

    const pesoTotal = useMemo(() => {
        if (!pedidoSeleccionado?.items) return 0;
        return pedidoSeleccionado.items.reduce((sum, item) => {
            return sum + (Number(item.quantity) || 0) * (Number(item.producto?.pesoUnitario) || 0);
        }, 0);
    }, [pedidoSeleccionado]);

    const calcularPallex = async () => {
        if (!provincia || !altura) { setErrorCalculo('Introduce provincia y altura del palé'); return; }
        setCalculando(true);
        setErrorCalculo('');
        try {
            const res = await fetch('/api/logistica/calcular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provincia: provincia.toUpperCase(),
                    peso: pesoTotal || 1,
                    altura: parseFloat(altura),
                    tipoPale,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setErrorCalculo(data.error || 'Error en cálculo'); return; }
            setCostesCalculados({ tipo: 'pallex', ...data });
        } catch {
            setErrorCalculo('Error de conexión');
        } finally {
            setCalculando(false);
        }
    };

    const costesEnvio = useMemo(() => {
        if (agencia === 'Pallex') return costesCalculados;
        const total = parseFloat(costeManual) || 0;
        if (!total) return null;
        return { tipo: 'manual', total };
    }, [agencia, costesCalculados, costeManual]);

    const subtotalProductos = Number(pedidoSeleccionado?.subtotal ?? 0);
    const totalEnvio = costesEnvio
        ? (costesEnvio.tipo === 'pallex' ? Number(costesEnvio.costeTotal) : Number(costesEnvio.total || 0))
        : 0;
    const baseImponible = subtotalProductos + totalEnvio;
    const iva = baseImponible * 0.21;
    const totalFinal = baseImponible + iva;

    const generarPDF = async () => {
        if (!pedidoSeleccionado) return;
        setGenerando(true);
        try {
            const res = await fetch(`/api/pedidos/${pedidoSeleccionado.id}/prefactura`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agencia, costesEnvio }),
            });
            if (!res.ok) { alert('Error al generar la prefactura'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prefactura-${pedidoSeleccionado.numero}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
                <FileText className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Prefactura</h1>
                    <p className="text-base-content/60 text-sm">Genera una pre-factura con desglose de productos y costes de envío</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Panel izquierdo — selección de pedido */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="card bg-base-100 shadow">
                        <div className="card-body p-4">
                            <h2 className="font-semibold flex items-center gap-2 mb-3">
                                <Search className="w-4 h-4" /> Seleccionar pedido
                            </h2>
                            <input
                                type="text"
                                placeholder="Buscar por número o cliente…"
                                className="input input-bordered input-sm w-full mb-3"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                                {pedidosFiltrados.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => seleccionarPedido(p)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-base-200 ${pedidoSeleccionado?.id === p.id ? 'border-primary bg-primary/5' : 'border-base-200'}`}
                                    >
                                        <div className="font-mono text-sm font-semibold">{p.numero}</div>
                                        <div className="text-sm text-base-content/70 truncate">{p.cliente?.nombre}</div>
                                        <div className="text-xs text-base-content/50 flex justify-between mt-1">
                                            <span>{new Date(p.fecha || p.fechaCreacion).toLocaleDateString('es-ES')}</span>
                                            <span className="font-semibold text-base-content/70">{fmtN(p.total)} €</span>
                                        </div>
                                    </button>
                                ))}
                                    {cargandoPedido && <p className="text-center text-base-content/50 text-sm py-4">Cargando pedido…</p>}
                            {!pedidosFiltrados.length && (
                                    <p className="text-center text-base-content/50 text-sm py-8">Sin resultados</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel derecho — configurador */}
                <div className="lg:col-span-3 space-y-4">
                    {!pedidoSeleccionado ? (
                        <div className="card bg-base-100 shadow">
                            <div className="card-body items-center justify-center py-20 text-base-content/40">
                                <ArrowRight className="w-12 h-12 mb-3" />
                                <p>Selecciona un pedido para continuar</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Resumen pedido */}
                            <div className="card bg-base-100 shadow">
                                <div className="card-body p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-mono font-bold text-lg">{pedidoSeleccionado.numero}</span>
                                            <span className="ml-3 text-base-content/60">{pedidoSeleccionado.cliente?.nombre}</span>
                                        </div>
                                        <span className="font-semibold">{fmtN(subtotalProductos)} € <span className="text-xs text-base-content/50">s/IVA</span></span>
                                    </div>
                                    {pesoTotal > 0 && (
                                        <p className="text-sm text-base-content/50 mt-1">
                                            <Package className="w-3 h-3 inline mr-1" />
                                            Peso aprox.: {fmtN(pesoTotal)} kg
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Configuración envío */}
                            <div className="card bg-base-100 shadow">
                                <div className="card-body p-4">
                                    <h2 className="font-semibold flex items-center gap-2 mb-4">
                                        <Truck className="w-4 h-4" /> Configurar envío
                                    </h2>

                                    {/* Selector de agencia */}
                                    <div className="mb-4">
                                        <label className="label py-1"><span className="label-text font-medium">Tipo de envío</span></label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Pallex', 'GLS', 'CBL', 'Furgoneta'].map(a => (
                                                <button
                                                    key={a}
                                                    onClick={() => { setAgencia(a); setCostesCalculados(null); setCosteManual(''); setErrorCalculo(''); }}
                                                    className={`btn btn-sm ${agencia === a ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {agencia === 'Pallex' ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="label py-1"><span className="label-text text-sm">Provincia destino</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: JAÉN"
                                                        className="input input-bordered input-sm w-full uppercase"
                                                        value={provincia}
                                                        onChange={e => setProvincia(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label py-1"><span className="label-text text-sm">Tipo de palé</span></label>
                                                    <select className="select select-bordered select-sm w-full" value={tipoPale} onChange={e => setTipoPale(e.target.value)}>
                                                        <option value="EUROPEO">Europeo (120×80cm)</option>
                                                        <option value="MEDIO">Medio palé (60×80cm)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label py-1"><span className="label-text text-sm">Altura del palé (cm)</span></label>
                                                <input
                                                    type="number"
                                                    placeholder="Ej: 120"
                                                    className="input input-bordered input-sm w-full"
                                                    value={altura}
                                                    onChange={e => setAltura(e.target.value)}
                                                />
                                            </div>
                                            {errorCalculo && <p className="text-error text-sm">{errorCalculo}</p>}
                                            <button
                                                onClick={calcularPallex}
                                                disabled={calculando}
                                                className="btn btn-secondary btn-sm gap-2"
                                            >
                                                <Calculator className="w-4 h-4" />
                                                {calculando ? 'Calculando…' : 'Calcular coste Pallex'}
                                            </button>

                                            {costesCalculados && (
                                                <div className="bg-base-200 rounded-lg p-3 text-sm space-y-1">
                                                    <div className="flex justify-between"><span className="text-base-content/60">Tipología:</span><span className="font-mono uppercase">{costesCalculados.tipologia}</span></div>
                                                    <div className="flex justify-between"><span className="text-base-content/60">· Palé:</span><span>{fmtN(costesCalculados.desglose.pale)} €</span></div>
                                                    <div className="flex justify-between"><span className="text-base-content/60">· Materiales embalaje:</span><span>{fmtN(costesCalculados.desglose.materiales)} €</span></div>
                                                    <div className="flex justify-between"><span className="text-base-content/60">· Transporte:</span><span>{fmtN(costesCalculados.costeTransporte)} €</span></div>
                                                    <div className="divider my-1" />
                                                    <div className="flex justify-between font-semibold"><span>Total envío:</span><span>{fmtN(costesCalculados.costeTotal)} €</span></div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="label py-1"><span className="label-text text-sm">Coste de envío ({agencia})</span></label>
                                            <div className="join">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0,00"
                                                    className="input input-bordered input-sm join-item w-40"
                                                    value={costeManual}
                                                    onChange={e => setCosteManual(e.target.value)}
                                                />
                                                <span className="btn btn-sm join-item no-animation bg-base-200 border-base-300 pointer-events-none">€</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resumen total */}
                            <div className="card bg-base-100 shadow">
                                <div className="card-body p-4">
                                    <h2 className="font-semibold mb-3">Resumen prefactura</h2>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-base-content/60">Subtotal productos</span>
                                            <span>{fmtN(subtotalProductos)} €</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-base-content/60">Coste envío ({agencia})</span>
                                            <span>{fmtN(totalEnvio)} €</span>
                                        </div>
                                        <div className="divider my-1" />
                                        <div className="flex justify-between">
                                            <span className="text-base-content/60">Base imponible</span>
                                            <span>{fmtN(baseImponible)} €</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-base-content/60">IVA 21%</span>
                                            <span>{fmtN(iva)} €</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-base pt-1">
                                            <span>TOTAL</span>
                                            <span className="text-primary">{fmtN(totalFinal)} €</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={generarPDF}
                                        disabled={generando || !pedidoSeleccionado}
                                        className="btn btn-primary w-full mt-4 gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        {generando ? 'Generando PDF…' : 'Generar Prefactura PDF'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
