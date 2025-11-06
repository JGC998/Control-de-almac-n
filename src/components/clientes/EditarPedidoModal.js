'use client';
import { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';

export default function EditarPedidoModal({ pedido, productos, clientes, onClose, onSave }) {
    const [cliente, setCliente] = useState(pedido.cliente);
    const [productosBorrador, setProductosBorrador] = useState(pedido.productos || []);
    const [notas, setNotas] = useState(pedido.notas || '');

    // Estado para el formulario de añadir nuevo producto
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    const handleAddProducto = (e) => {
        e.preventDefault();
        if (!productoSeleccionadoId || cantidadProducto < 1) return;

        const productoToAdd = productos.find(p => p.id == productoSeleccionadoId);
        if (!productoToAdd) return;

        const nuevoProducto = {
            id: `${Date.now()}-${productoToAdd.id}`,
            productoId: productoToAdd.id,
            nombre: productoToAdd.nombre,
            cantidad: cantidadProducto,
            precioUnitario: productoToAdd.precioUnitario,
            pesoUnitario: productoToAdd.pesoUnitario,
        };
        setProductosBorrador(prev => [...prev, nuevoProducto]);
        setProductoSeleccionadoId('');
        setCantidadProducto(1);
    };

    const handleRemoveProducto = (id) => {
        setProductosBorrador(prev => prev.filter(p => p.id !== id));
    };

    const handleGuardarCambios = () => {
        const pedidoActualizado = {
            ...pedido,
            cliente,
            productos: productosBorrador,
            notas,
        };
        onSave(pedidoActualizado);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
                <h3 className="font-bold text-lg">Editando Pedido</h3>
                
                <div className="form-control my-4">
                    <label className="label"><span className="label-text">Nombre del Cliente</span></label>
                    <select className="select select-bordered w-full" value={cliente} onChange={(e) => setCliente(e.target.value)} required>
                        <option value="" disabled>Seleccionar cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="form-control my-4">
                    <label className="label"><span className="label-text">Notas</span></label>
                    <textarea className="textarea textarea-bordered h-24" value={notas} onChange={(e) => setNotas(e.target.value)}></textarea>
                </div>

                <div className="divider">Productos</div>
                <ul className="menu bg-base-200 rounded-box mb-4">
                    {(productos || []).map(p => (
                        <li key={p.id}>
                            <div className="flex justify-between items-center">
                                <span>{p.cantidad} x {p.nombre}</span>
                                <button onClick={() => handleRemoveProducto(p.id)} className="btn btn-ghost btn-xs"><FaTrash /></button>
                            </div>
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleAddProducto} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end p-4 border rounded-lg">
                    <div className="form-control sm:col-span-2">
                        <label className="label"><span className="label-text">Añadir Producto</span></label>
                        <select className="select select-bordered" value={productoSeleccionadoId} onChange={e => setProductoSeleccionadoId(e.target.value)} required>
                            <option value="" disabled>Seleccionar producto...</option>
                            {productos.map(p => (
                                <option key={p.id} value={p.id}>{`${p.nombre} (${p.material} ${p.espesor}mm, ${p.largo}x${p.ancho}mm)`}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Cantidad</span></label>
                        <input type="number" min="1" className="input input-bordered" value={cantidadProducto} onChange={e => setCantidadProducto(Number(e.target.value))} required />
                    </div>
                    <button type="submit" className="btn btn-secondary sm:col-start-3"><FaPlus /> Añadir</button>
                </form>

                <div className="modal-action">
                    <button onClick={onClose} className="btn">Cancelar</button>
                    <button onClick={handleGuardarCambios} className="btn btn-primary">Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}
