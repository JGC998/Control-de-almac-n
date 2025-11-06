'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { FaEye, FaEdit, FaCheck, FaUndo, FaTrash } from 'react-icons/fa';
import { formatCurrency, formatWeight } from '@/utils/utils';

export default function PedidoCard({ pedido, clientes, onToggle, onDelete, onEdit }) {
    const totales = useMemo(() => (pedido.productos || []).reduce((acc, p) => {
        acc.precio += p.precioUnitario * p.cantidad;
        acc.peso += p.pesoUnitario * p.cantidad;
        return acc;
    }, { precio: 0, peso: 0 }), [pedido.productos]);

    const clienteNombre = useMemo(() => {
        if (pedido.clienteId && clientes) {
            const cliente = clientes.find(c => c.id === pedido.clienteId);
            return cliente ? cliente.nombre : 'Cliente no encontrado';
        }
        return pedido.cliente || 'Cliente Desconocido';
    }, [pedido, clientes]);

    const fechaPedido = new Date(pedido.fechaCreacion || pedido.fecha).toLocaleString('es-ES');

    return (
        <div className={`card card-compact bg-base-100 shadow-md mb-4 ${pedido.estado === 'Completado' ? 'opacity-60' : ''}`}>
            <div className="card-body">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="card-title">{clienteNombre}</h3>
                        <p className="text-sm opacity-70">{fechaPedido}</p>
                    </div>
                    <div className="card-actions">
                        <Link href={`/pedidos/${pedido.id}`} className="btn btn-outline btn-primary btn-sm" title="Ver Detalles"><FaEye /></Link>
                        <button onClick={() => onEdit(pedido)} className="btn btn-outline btn-info btn-sm" title="Editar Pedido"><FaEdit /></button>
                        {pedido.estado === 'Activo' ? (
                            <button onClick={() => onToggle(pedido.id, pedido.estado)} className="btn btn-success btn-sm" title="Marcar como Completado"><FaCheck /> Completar</button>
                        ) : (
                            <button onClick={() => onToggle(pedido.id, pedido.estado)} className="btn btn-warning btn-sm" title="Marcar como Activo"><FaUndo /> Reactivar</button>
                        )}
                        <button onClick={() => onDelete(pedido.id)} className="btn btn-ghost btn-sm text-error" title="Eliminar"><FaTrash /></button>
                    </div>
                </div>
                <div className="divider my-1"></div>
                <ul className="list-disc list-inside mt-2 text-sm">
                    {(pedido.productos || []).map(prod => <li key={prod.id}>{prod.cantidad} x {prod.nombre}</li>)}
                </ul>
                <div className="divider my-1"></div>
                <div className="flex justify-end gap-4 text-sm font-semibold">
                    <span>Peso Total: <span className="font-mono text-secondary">{formatWeight(totales.peso)}</span></span>
                    <span>Precio Total: <span className="font-mono text-primary">{formatCurrency(totales.precio)}</span></span>
                </div>
            </div>
        </div>
    );
}
