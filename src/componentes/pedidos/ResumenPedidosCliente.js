'use client';

import { useMemo } from 'react';

export default function ResumenPedidosCliente({ pedidos, clients }) {

    const resumen = useMemo(() => {
        if (!pedidos || !clients) return {};

        const clientMap = new Map(clients.map(c => [c.id, c.nombre]));

        return pedidos
            .filter(p => p.estado === 'Activo')
            .reduce((acc, pedido) => {
                const cliente = pedido.clienteId ? clientMap.get(pedido.clienteId) : (pedido.cliente || 'Cliente Desconocido');
                if (!acc[cliente]) {
                    acc[cliente] = 0;
                }
                acc[cliente]++;
                return acc;
            }, {});

    }, [pedidos, clients]);

    const clientes = Object.keys(resumen).sort();

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-accent">Pedidos Activos por Cliente</h2>
                {clientes.length > 0 ? (
                    <ul className="list-disc list-inside">
                        {clientes.map(cliente => (
                            <li key={cliente}>
                                <span className="font-semibold">{cliente}:</span> {resumen[cliente]} pedido(s)
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-base-content/60">No hay pedidos activos.</p>
                )}
            </div>
        </div>
    );
}
