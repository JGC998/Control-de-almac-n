'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo, FaBook, FaBoxOpen, FaSpinner } from 'react-icons/fa';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatWeight } from '@/utils/utils';

// --- Componentes Hijos (Componentes más pequeños y enfocados) ---

function CatalogoManager({ catalogo, onCatalogoUpdate, datosMateriales }) {
    const [nombre, setNombre] = useState('');
    const [material, setMaterial] = useState('');
    const [espesor, setEspesor] = useState('');
    const [largo, setLargo] = useState('');
    const [ancho, setAncho] = useState('');

    const materialesUnicos = useMemo(() => [...new Set(datosMateriales.map(item => item.material))], [datosMateriales]);
    const espesoresDisponibles = useMemo(() => {
        if (material) {
            return datosMateriales.filter(item => item.material === material).map(item => item.espesor);
        }
        return [];
    }, [material, datosMateriales]);

    const handleAdd = async (e) => {
        e.preventDefault();
        const nuevoProducto = { nombre, material, espesor, largo, ancho };

        try {
            const res = await fetch('/api/catalogo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProducto),
            });
            if (!res.ok) throw new Error('Error al guardar en el catálogo');
            
            // Limpiar formulario y notificar al padre para que recargue los datos
            setNombre(''); setMaterial(''); setEspesor(''); setLargo(''); setAncho('');
            onCatalogoUpdate();
        } catch (error) {
            console.error("Error guardando catálogo:", error);
            alert('No se pudo añadir el producto al catálogo.');
        }
    };

    const handleRemove = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este producto del catálogo?')) {
            try {
                const res = await fetch(`/api/catalogo/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar del catálogo');
                onCatalogoUpdate(); // Notificar para recargar
            } catch (error) {
                console.error("Error eliminando del catálogo:", error);
                alert('No se pudo eliminar el producto.');
            }
        }
    };

    return (
        <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
                <h2 className="card-title mb-4 flex items-center gap-2"><FaBook /> Catálogo de Productos</h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-base-300 pb-6 mb-6">
                    <input type="text" placeholder="Nombre del Producto (ej: Faldeta Estándar)" className="input input-bordered md:col-span-3" value={nombre} onChange={e => setNombre(e.target.value)} required />
                    <select className="select select-bordered" value={material} onChange={e => setMaterial(e.target.value)} required>
                        <option value="" disabled>Material</option>
                        {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="select select-bordered" value={espesor} onChange={e => setEspesor(e.target.value)} disabled={!material} required>
                        <option value="" disabled>Espesor</option>
                        {espesoresDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <div className="md:col-span-1 grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Largo (mm)" className="input input-bordered" value={largo} onChange={e => setLargo(e.target.value)} required />
                        <input type="number" placeholder="Ancho (mm)" className="input input-bordered" value={ancho} onChange={e => setAncho(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-accent md:col-span-3"><FaPlus /> Añadir al Catálogo</button>
                </form>
                <div className="max-h-40 overflow-y-auto">
                    <table className="table table-sm">
                        <tbody>
                            {catalogo.map(p => (
                                <tr key={p.id} className="hover">
                                    <td><strong>{p.nombre}</strong></td>
                                    <td>{p.material} {p.espesor}mm</td>
                                    <td>{p.largo}x{p.ancho}mm</td>
                                    <td><button onClick={() => handleRemove(p.id)} className="btn btn-ghost btn-xs"><FaTrash /></button></td>
                                </tr>
                            ))}
                            {catalogo.length === 0 && <tr><td colSpan="4" className="text-center">Aún no hay productos en el catálogo.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function NuevoPedido({ catalogo, datosMateriales, onPedidoCreado }) {
    const [cliente, setCliente] = useState('');
    const [productosBorrador, setProductosBorrador] = useState([]);
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    const handleAddProductoAlBorrador = (e) => {
        e.preventDefault();
        if (!productoSeleccionadoId || cantidadProducto < 1) return;

        const productoCat = catalogo.find(p => p.id == productoSeleccionadoId);
        if (!productoCat) return;

        const materialInfo = datosMateriales.find(m => m.material === productoCat.material && m.espesor == productoCat.espesor);
        if (!materialInfo) {
            alert('No se encontraron datos de precio/peso para el material de este producto.');
            return;
        }

        const areaM2 = (productoCat.largo / 1000) * (productoCat.ancho / 1000);
        const precioUnitario = areaM2 * materialInfo.precio;
        const pesoUnitario = areaM2 * materialInfo.peso;

        const nuevoProducto = {
            id: `${Date.now()}-${productoCat.id}`,
            productoId: productoCat.id,
            nombre: productoCat.nombre,
            cantidad: cantidadProducto,
            precioUnitario,
            pesoUnitario,
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
                    <input type="text" placeholder="Nombre del Cliente" className="input input-bordered w-full" value={cliente} onChange={(e) => setCliente(e.target.value)} />
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
                        <label className="label"><span className="label-text">Producto del Catálogo</span></label>
                        <select className="select select-bordered" value={productoSeleccionadoId} onChange={e => setProductoSeleccionadoId(e.target.value)} required>
                            <option value="" disabled>Seleccionar producto...</option>
                            {catalogo.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Cantidad</span></label>
                        <input type="number" min="1" className="input input-bordered" value={cantidadProducto} onChange={e => setCantidadProducto(Number(e.target.value))} required />
                    </div>
                    <button type="submit" className="btn btn-secondary sm:col-start-3"><FaPlus /> Añadir Producto</button>
                </form>

                <div className="card-actions justify-end mt-6">
                    <button onClick={handleSavePedido} className="btn btn-primary" disabled={!cliente || productosBorrador.length === 0}>
                        Confirmar y Guardar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

function PedidosHistorial({ pedidos, onUpdate }) {
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
                        {pedidosActivos.map(p => <PedidoCard key={p.id} pedido={p} onToggle={handleToggleEstado} onDelete={handleDelete} />)}
                        {pedidosActivos.length === 0 && <p className="text-center p-4">No hay pedidos activos.</p>}
                    </div>
                </div>

                <div className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" />
                    <div className="collapse-title text-xl font-medium">
                        Pedidos Completados ({pedidosCompletados.length})
                    </div>
                    <div className="collapse-content">
                        {pedidosCompletados.map(p => <PedidoCard key={p.id} pedido={p} onToggle={handleToggleEstado} onDelete={handleDelete} />)}
                        {pedidosCompletados.length === 0 && <p className="text-center p-4">No hay pedidos completados.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal (Orquestador) ---

function PedidosClientesPage() {
    const [pedidos, setPedidos] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Carga de datos de materiales (precios.json)
    useEffect(() => {
        const fetchMateriales = async () => {
            try {
                const response = await fetch('/data/precios.json');
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
            const [catalogoRes, pedidosRes] = await Promise.all([
                fetch('/api/catalogo'),
                fetch('/api/pedidos')
            ]);
            if (!catalogoRes.ok || !pedidosRes.ok) {
                throw new Error('Error al cargar los datos del servidor');
            }
            setCatalogo(await catalogoRes.json());
            setPedidos(await pedidosRes.json());
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

            <CatalogoManager catalogo={catalogo} onCatalogoUpdate={fetchData} datosMateriales={datosMateriales} />

            <NuevoPedido catalogo={catalogo} datosMateriales={datosMateriales} onPedidoCreado={fetchData} />

            <PedidosHistorial pedidos={pedidos} onUpdate={fetchData} />
        </main>
    );
}

function PedidoCard({ pedido, onToggle, onDelete }) {
    // Este componente ya estaba bien diseñado, solo ajustamos los handlers que recibe
    const totales = useMemo(() => pedido.productos.reduce((acc, p) => {
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
                    {pedido.productos.map(prod => <li key={prod.id}>{prod.cantidad} x {prod.nombre}</li>)}
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