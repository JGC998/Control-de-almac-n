"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Truck, Info, Settings, Search, CheckCircle, X } from 'lucide-react';
import CalculadoraLogistica from '@/componentes/calculadoras/CalculadoraLogistica';

function ModalAnadirPedido({ item, onClose, onSuccess }) {
    const [query, setQuery]     = useState('');
    const [adding, setAdding]   = useState(false);
    const [addError, setAddError] = useState(null);

    const { data: result } = useSWR('/api/pedidos?limit=200', null, { revalidateOnFocus: false });
    const pedidos = (result?.data || result || []).filter(p => {
        if (p.estado === 'Cancelado' || p.estado === 'Facturado') return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return p.numero?.toLowerCase().includes(q) || p.cliente?.nombre?.toLowerCase().includes(q);
    });

    const handleAnadir = async (pedido) => {
        setAdding(true);
        setAddError(null);
        try {
            const detailRes = await fetch(`/api/pedidos/${pedido.id}`);
            if (!detailRes.ok) throw new Error('No se pudo cargar el pedido');
            const full = await detailRes.json();

            const updatedItems = [
                ...full.items.map(i => ({
                    descripcion: i.descripcion,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    pesoUnitario: i.pesoUnitario || 0,
                    productoId: i.productoId || null,
                    detallesTecnicos: i.detallesTecnicos || null,
                })),
                {
                    descripcion: item.descripcion,
                    quantity: 1,
                    unitPrice: item.unitPrice,
                    pesoUnitario: 0,
                    productoId: null,
                    detallesTecnicos: item.detalles || null,
                },
            ];

            const subtotal = updatedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

            const putRes = await fetch(`/api/pedidos/${pedido.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clienteId: full.clienteId || null,
                    items: updatedItems,
                    notas: full.notas,
                    subtotal,
                    tax: full.tax,
                    total: subtotal + full.tax,
                    estado: full.estado,
                    marginId: full.marginId || null,
                }),
            });
            if (!putRes.ok) {
                const err = await putRes.json();
                throw new Error(err.message || 'Error al actualizar el pedido');
            }
            onSuccess(pedido);
        } catch (e) {
            setAddError(e.message);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="modal modal-open bg-black/50 backdrop-blur-sm">
            <div className="modal-box max-w-xl">
                <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X className="w-4 h-4" /></button>
                <h3 className="font-bold text-lg mb-1">Añadir a un pedido</h3>
                <p className="text-sm text-base-content/50 mb-4">
                    Se añadirá <strong>{item.descripcion}</strong> ({item.unitPrice.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €) como línea nueva.
                </p>

                {addError && <div className="alert alert-error text-sm mb-3">{addError}</div>}

                <label className="input input-bordered input-sm flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 opacity-40" />
                    <input type="text" className="grow" placeholder="Buscar por número o cliente…"
                        value={query} onChange={e => setQuery(e.target.value)} />
                </label>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {pedidos.length === 0 && (
                        <p className="text-center text-base-content/40 py-6 text-sm">
                            No hay pedidos activos{query ? ` para "${query}"` : ''}
                        </p>
                    )}
                    {pedidos.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-base-200 rounded-lg px-4 py-2 gap-3">
                            <div>
                                <span className="font-mono text-sm font-semibold">{p.numero}</span>
                                <span className="text-xs text-base-content/50 ml-2">{p.cliente?.nombre ?? 'Sin cliente'}</span>
                            </div>
                            <button
                                className="btn btn-primary btn-xs shrink-0"
                                disabled={adding}
                                onClick={() => handleAnadir(p)}
                            >
                                {adding ? <span className="loading loading-spinner loading-xs" /> : 'Añadir'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="modal-backdrop" onClick={onClose} />
        </div>
    );
}

export default function CalculadoraLogisticaPage() {
    const [pendingItem, setPendingItem] = useState(null);
    const [added, setAdded]             = useState(null);

    const handleAddToOrder = (item) => {
        setAdded(null);
        setPendingItem(item);
    };

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Truck className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Calculadora de Envíos</h1>
                </div>
                <Link href="/configuracion/logistica" className="btn btn-ghost btn-sm">
                    <Settings className="w-4 h-4" />
                    Configurar Tarifas
                </Link>
            </div>

            {added && (
                <div className="alert alert-success mb-4">
                    <CheckCircle className="w-5 h-5" />
                    Coste de envío añadido al pedido <strong>{added.numero}</strong>.{' '}
                    <Link href={`/pedidos/${added.id}`} className="underline font-semibold">Ver pedido →</Link>
                </div>
            )}

            <CalculadoraLogistica onAddToOrder={handleAddToOrder} />

            <div className="alert alert-info mt-6">
                <Info className="w-5 h-5" />
                <div>
                    <h3 className="font-bold">Información sobre el cálculo</h3>
                    <div className="text-sm mt-2 space-y-1">
                        <p><strong>Coste de Paletizado:</strong> Incluye el palé base + materiales consumibles (film, fleje, precinto)</p>
                        <p><strong>Coste de Transporte:</strong> Según tarifas Pallex 2026, calculado automáticamente según peso, altura y destino</p>
                        <p><strong>Tipologías disponibles:</strong> PARCEL, MINI QUARTER, QUARTER, MINI LIGHT, HALF, LIGHT, MEGA LIGHT, FULL, MEGA FULL</p>
                    </div>
                </div>
            </div>

            <div className="card bg-base-200 mt-4">
                <div className="card-body">
                    <h3 className="card-title text-sm">Guía Rápida</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        <li><strong>Palé Europeo:</strong> 120x80 cm (estándar)</li>
                        <li><strong>Medio Palé:</strong> 60x80 cm (más económico para envíos pequeños)</li>
                        <li>El sistema selecciona automáticamente la tipología más económica según peso y altura</li>
                        <li>Puedes actualizar las tarifas desde el panel de configuración</li>
                    </ul>
                </div>
            </div>

            {pendingItem && (
                <ModalAnadirPedido
                    item={pendingItem}
                    onClose={() => setPendingItem(null)}
                    onSuccess={(pedido) => { setPendingItem(null); setAdded(pedido); }}
                />
            )}
        </div>
    );
}
