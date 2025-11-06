'use client';
import { useState, useMemo } from 'react';
import { FaBoxOpen, FaPlus, FaTrash } from 'react-icons/fa';
import { formatCurrency } from '@/utils/utils';

export default function NuevoPedidoForm({ productos, clientes, onPedidoCreado }) {
    const [clienteId, setClienteId] = useState('');
    const [productosBorrador, setProductosBorrador] = useState([]);
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);
    const [notas, setNotas] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddProductoAlBorrador = async (e) => {
        e.preventDefault();
        if (!productoSeleccionadoId || !clienteId || cantidadProducto < 1) {
            alert('Por favor, selecciona un cliente y un producto.');
            return;
        }
        
        setIsAdding(true);

        try {
            const productoToAdd = productos.find(p => p.id === productoSeleccionadoId);
            if (!productoToAdd) throw new Error('Producto no encontrado');

            // Llamar a la API del motor de precios
            const priceRes = await fetch('/api/pricing/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: productoSeleccionadoId,
                    clientId: clienteId,
                    quantity: cantidadProducto
                })
            });

            if (!priceRes.ok) throw new Error('Error al calcular el precio');
            const priceData = await priceRes.json();

            const nuevoProducto = {
                id: `${Date.now()}-${productoToAdd.id}`,
                productoId: productoToAdd.id,
                nombre: productoToAdd.nombre,
                cantidad: cantidadProducto,
                precioUnitario: priceData.finalPrice, // Usar el precio calculado
                pesoUnitario: productoToAdd.pesoUnitario,
            };

            setProductosBorrador(prev => [...prev, nuevoProducto]);
            setProductoSeleccionadoId('');
            setCantidadProducto(1);

        } catch (error) {
            console.error("Error añadiendo producto:", error);
            alert('No se pudo añadir el producto o calcular su precio.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveProductoBorrador = (id) => {
        setProductosBorrador(prev => prev.filter(p => p.id !== id));
    };

    const handleSavePedido = async () => {
        if (!clienteId || productosBorrador.length === 0) {
            alert('Debe especificar un cliente y añadir al menos un producto.');
            return;
        }

        const clienteSeleccionado = clientes.find(c => c.id === clienteId);

        const nuevoPedido = {
            cliente: clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente Desconocido',
            productos: productosBorrador,
            fecha: new Date().toISOString(),
            estado: 'Activo',
            notas,
        };

        try {
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPedido)
            });
            if (!res.ok) throw new Error('Error al guardar el pedido');

            setClienteId('');
            setProductosBorrador([]);
            setNotas('');
            onPedidoCreado();
        } catch (error) {
            console.error("Error guardando pedido:", error);
            alert('No se pudo guardar el pedido.');
        }
    };

    const totalesBorrador = useMemo(() => productosBorrador.reduce((acc, p) => {
        acc.precio += (p.precioUnitario || 0) * p.cantidad;
        acc.peso += (p.pesoUnitario || 0) * p.cantidad;
        return acc;
    }, { precio: 0, peso: 0 }), [productosBorrador]);

    return (
        <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
                <h2 className="card-title mb-4 flex items-center gap-2"><FaBoxOpen /> Nuevo Pedido</h2>
                <div className="form-control mb-4">
                    <label className="label"><span className="label-text">Cliente</span></label>
                    <select className="select select-bordered w-full" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                        <option value="" disabled>Seleccionar cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="divider">Productos del Pedido</div>

                {productosBorrador.length > 0 && (
                    <ul className="menu bg-base-200 rounded-box mb-4">
                        {productosBorrador.map(p => (
                            <li key={p.id}>
                                <div className="flex justify-between items-center">
                                    <span>{p.cantidad} x {p.nombre}</span>
                                    <span className="font-mono text-sm">{formatCurrency(p.precioUnitario * p.cantidad)}</span>
                                    <button onClick={() => handleRemoveProductoBorrador(p.id)} className="btn btn-ghost btn-xs"><FaTrash /></button>
                                </div>
                            </li>
                        ))}
                        <li className="font-bold">
                            <div className="flex justify-between items-center">
                                <span>TOTAL BORRADOR</span>
                                <span className="font-mono text-sm">{formatCurrency(totalesBorrador.precio)}</span>
                                <span></span>
                            </div>
                        </li>
                    </ul>
                )}

                <form onSubmit={handleAddProductoAlBorrador} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div className="form-control sm:col-span-2">
                        <label className="label"><span className="label-text">Producto</span></label>
                        <select className="select select-bordered" value={productoSeleccionadoId} onChange={e => setProductoSeleccionadoId(e.target.value)} required disabled={!clienteId}>
                            <option value="" disabled>Seleccionar producto...</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id}>{`${p.nombre} (${p.material} ${p.espesor}mm, ${p.largo}x${p.ancho}mm)`}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Cantidad</span></label>
                        <input type="number" min="1" className="input input-bordered" value={cantidadProducto} onChange={e => setCantidadProducto(Number(e.target.value))} required disabled={!clienteId}/>
                    </div>
                    <button type="submit" className="btn btn-secondary sm:col-start-3" disabled={isAdding || !clienteId}>
                        {isAdding ? <span className="loading loading-spinner"></span> : <FaPlus />}
                        Añadir Producto
                    </button>
                </form>

                <div className="card-actions justify-end mt-6">
                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Notas Adicionales</span></label>
                        <textarea className="textarea textarea-bordered h-24" placeholder="Añade aquí cualquier nota o comentario sobre el pedido..." value={notas} onChange={(e) => setNotas(e.target.value)}></textarea>
                    </div>
                    <button onClick={handleSavePedido} className="btn btn-primary mt-4" disabled={!clienteId || productosBorrador.length === 0}>
                        Confirmar y Guardar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}
