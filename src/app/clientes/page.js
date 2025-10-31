'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo, FaBook, FaBoxOpen, FaSpinner, FaEdit, FaEye } from 'react-icons/fa';
import Link from 'next/link';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatWeight } from '@/utils/utils';

// --- Componentes Hijos (Componentes más pequeños y enfocados) ---



function NuevoPedido({ productos, clientes, onPedidoCreado }) {
    const [cliente, setCliente] = useState('');
    const [productosBorrador, setProductosBorrador] = useState([]);
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);
    const [notas, setNotas] = useState('');

    const handleAddProductoAlBorrador = (e) => {
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

    const handleRemoveProductoBorrador = (id) => {
        setProductosBorrador(prev => prev.filter(p => p.id !== id));
    };

    const handleSavePedido = async () => {
        if (!cliente.trim() || productosBorrador.length === 0) {
            alert('Debe especificar un cliente y añadir al menos un producto.');
            return;
        }

        const nuevoPedido = {
            cliente,
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

            // Limpiar formulario y notificar al padre
            setCliente('');
            setProductosBorrador([]);
            setNotas('');
            onPedidoCreado();
        } catch (error) {
            console.error("Error guardando pedido:", error);
            alert('No se pudo guardar el pedido.');
        }
    };

    const totalesBorrador = useMemo(() => productosBorrador.reduce((acc, p) => {
        acc.precio += p.precioUnitario * p.cantidad;
        acc.peso += p.pesoUnitario * p.cantidad;
        return acc;
    }, { precio: 0, peso: 0 }), [productosBorrador]);

    return (
        <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
                <h2 className="card-title mb-4 flex items-center gap-2"><FaBoxOpen /> Nuevo Pedido</h2>
                <div className="form-control mb-4">
                    <label className="label"><span className="label-text">Nombre del Cliente</span></label>
                    <select className="select select-bordered w-full" value={cliente} onChange={(e) => setCliente(e.target.value)} required>
                        <option value="" disabled>Seleccionar cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
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
                    <button type="submit" className="btn btn-secondary sm:col-start-3"><FaPlus /> Añadir Producto</button>
                </form>

                <div className="card-actions justify-end mt-6">
                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Notas Adicionales</span></label>
                        <textarea className="textarea textarea-bordered h-24" placeholder="Añade aquí cualquier nota o comentario sobre el pedido..." value={notas} onChange={(e) => setNotas(e.target.value)}></textarea>
                    </div>
                    <button onClick={handleSavePedido} className="btn btn-primary mt-4" disabled={!cliente || productosBorrador.length === 0}>
                        Confirmar y Guardar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

function PedidosHistorial({ pedidos, onUpdate, onEdit }) {
    const pedidosActivos = useMemo(() => pedidos.filter(p => p.estado === 'Activo'), [pedidos]);
    const pedidosCompletados = useMemo(() => pedidos.filter(p => p.estado === 'Completado'), [pedidos]);

    const handleToggleEstado = async (id, estadoActual) => {
        const nuevoEstado = estadoActual === 'Activo' ? 'Completado' : 'Activo';
        try {
            const res = await fetch(`/api/pedidos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (!res.ok) throw new Error('Error al actualizar estado');
            onUpdate();
        } catch (error) {
            console.error("Error actualizando estado:", error);
            alert('No se pudo actualizar el estado del pedido.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
            try {
                const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar pedido');
                onUpdate();
            } catch (error) {
                console.error("Error eliminando pedido:", error);
                alert('No se pudo eliminar el pedido.');
            }
        }
    };

    const handleExportarPDF = () => {
        if (pedidos.length === 0) {
            alert('No hay pedidos para exportar.');
            return;
        }

        const doc = new jsPDF();
        const currentDate = new Date().toLocaleDateString('es-ES');

        doc.setFontSize(22);
        doc.setTextColor(40, 167, 69);
        doc.text("Listado de Pedidos de Clientes", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${currentDate}`, 14, 30);

        const head = [["Fecha", "Cliente", "Detalles", "Estado"]];
        const body = pedidos.map(p => [
            new Date(p.fecha).toLocaleDateString('es-ES'),
            p.cliente,
            p.productos.map(prod => `${prod.cantidad} x ${prod.nombre}`).join('\n'),
            p.estado,
        ]);

        autoTable(doc, { startY: 40, head, body, theme: 'striped', headStyles: { fillColor: [40, 167, 69] } });

        doc.save(`Pedidos_Clientes_${currentDate.replace(/\//g, '-')}.pdf`);
    };

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="card-title">Historial de Pedidos</h2>
                    <button onClick={handleExportarPDF} className="btn btn-accent btn-sm" disabled={pedidos.length === 0}><FaFilePdf /> Exportar Listado</button>
                </div>

                <div className="collapse collapse-arrow bg-base-200 mb-2">
                    <input type="checkbox" defaultChecked />
                    <div className="collapse-title text-xl font-medium">
                        Pedidos Activos ({pedidosActivos.length})
                    </div>
                    <div className="collapse-content">
                        {pedidosActivos.map(p => <PedidoCard key={p.id} pedido={p} onToggle={handleToggleEstado} onDelete={handleDelete} onEdit={onEdit} />)}
                        {pedidosActivos.length === 0 && <p className="text-center p-4">No hay pedidos activos.</p>}
                    </div>
                </div>

                <div className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" />
                    <div className="collapse-title text-xl font-medium">
                        Pedidos Completados ({pedidosCompletados.length})
                    </div>
                    <div className="collapse-content">
                        {pedidosCompletados.map(p => <PedidoCard key={p.id} pedido={p} onToggle={handleToggleEstado} onDelete={handleDelete} onEdit={onEdit} />)}
                        {pedidosCompletados.length === 0 && <p className="text-center p-4">No hay pedidos completados.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditarPedidoModal({ pedido, productos, clientes, onClose, onSave }) {
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

// --- Componente Principal (Orquestador) ---

function PedidosClientesPage() {
    const [pedidos, setPedidos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [fabricantes, setFabricantes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pedidoEnEdicion, setPedidoEnEdicion] = useState(null);

    // Carga de datos de materiales (precios.json)
    useEffect(() => {
        const fetchMateriales = async () => {
            try {
                const response = await fetch('/api/precios');
                if (!response.ok) throw new Error('No se pudo cargar precios.json');
                setDatosMateriales(await response.json());
            } catch (error) {
                console.error('Error fetching materiales:', error);
                setError('No se pudieron cargar los datos de materiales.');
            }
        };
        fetchMateriales();
    }, []);

    // Función para cargar catálogos y pedidos, envuelta en useCallback
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [productosRes, pedidosRes, fabricantesRes, clientesRes] = await Promise.all([
                fetch('/api/productos'),
                fetch('/api/pedidos'),
                fetch('/api/fabricantes'),
                fetch('/api/clientes')
            ]);
            if (!productosRes.ok || !pedidosRes.ok || !fabricantesRes.ok || !clientesRes.ok) {
                throw new Error('Error al cargar los datos del servidor');
            }
            setProductos(await productosRes.json());
            setPedidos(await pedidosRes.json());
            setFabricantes(await fabricantesRes.json());
            setClientes(await clientesRes.json());
        } catch (err) {
            console.error("Fallo al cargar datos:", err);
            setError(err.message || 'Ocurrió un error desconocido.');
        } finally {
            setLoading(false);
        }
    }, []); // useCallback con array vacío para que la función no se recree

    // Carga inicial de datos
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGuardarEdicion = async (pedidoActualizado) => {
        try {
            const res = await fetch(`/api/pedidos/${pedidoActualizado.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedidoActualizado)
            });
            if (!res.ok) throw new Error('Error al guardar los cambios del pedido');
            
            setPedidoEnEdicion(null); // Cierra el modal
            fetchData(); // Recarga todos los datos
        } catch (error) {
            console.error("Error guardando cambios del pedido:", error);
            alert('No se pudieron guardar los cambios.');
        }
    };

    if (error) {
        return <div className="p-8 text-center text-red-500">Error: {error}</div>;
    }

    if (loading && pedidos.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <FaSpinner className="animate-spin text-4xl text-primary" />
            </div>
        );
    }

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaClipboardList /> Pedidos de Clientes
            </h1>

            <NuevoPedido productos={productos} clientes={clientes} onPedidoCreado={fetchData} />

            <PedidosHistorial pedidos={pedidos} onUpdate={fetchData} onEdit={setPedidoEnEdicion} />

            {pedidoEnEdicion && (
                <EditarPedidoModal 
                    pedido={pedidoEnEdicion}
                    productos={productos}
                    clientes={clientes}
                    onClose={() => setPedidoEnEdicion(null)}
                    onSave={handleGuardarEdicion}
                />
            )}
        </main>
    );
}

function PedidoCard({ pedido, onToggle, onDelete, onEdit }) {
    const totales = useMemo(() => (pedido.productos || []).reduce((acc, p) => {
        acc.precio += p.precioUnitario * p.cantidad;
        acc.peso += p.pesoUnitario * p.cantidad;
        return acc;
    }, { precio: 0, peso: 0 }), [pedido.productos]);

    return (
        <div className={`card card-compact bg-base-100 shadow-md mb-4 ${pedido.estado === 'Completado' ? 'opacity-60' : ''}`}>
            <div className="card-body">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="card-title">{pedido.cliente}</h3>
                        <p className="text-sm opacity-70">{new Date(pedido.fecha).toLocaleString('es-ES')}</p>
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

export default PedidosClientesPage;