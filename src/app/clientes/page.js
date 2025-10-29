'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo, FaBook, FaBoxOpen, FaSpinner, FaEdit } from 'react-icons/fa';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatWeight } from '@/utils/utils';

// --- Componentes Hijos (Componentes más pequeños y enfocados) ---

function PlantillasManager({ plantillas, fabricantes, onUpdate, datosMateriales }) {
    const [fabricante, setFabricante] = useState('');
    const [modelo, setModelo] = useState('');
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

    const handleAddPlantilla = async (e) => {
        e.preventDefault();
        const nuevaPlantilla = { fabricante, modelo, material, espesor, largo, ancho };

        // --- NUEVA LÓGICA ---
        // 1. Comprobar si el fabricante es nuevo.
        const fabricanteNormalizado = fabricante.trim().toUpperCase();
        const esFabricanteNuevo = !fabricantes.some(f => f.nombre.toUpperCase() === fabricanteNormalizado);

        // 2. Si es nuevo, crearlo primero.
        if (esFabricanteNuevo) {
            try {
                await fetch('/api/fabricantes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: fabricante.trim() }),
                });
            } catch (error) {
                alert('Hubo un error al intentar crear el nuevo fabricante. Inténtalo de nuevo.');
                return;
            }
        }

        try {
            const res = await fetch('/api/plantillas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaPlantilla),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al guardar la plantilla');
            }
            
            // Limpiar formulario y notificar al padre para que recargue los datos
            setFabricante(''); setModelo(''); setMaterial(''); setEspesor(''); setLargo(''); setAncho('');
            onUpdate();
        } catch (error) {
            console.error("Error guardando plantilla:", error);
            alert(`No se pudo añadir la plantilla: ${error.message}`);
        }
    };

    const handleRemove = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar esta plantilla?')) {
            try {
                const res = await fetch(`/api/plantillas/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al eliminar la plantilla');
                onUpdate(); // Notificar para recargar
            } catch (error) {
                console.error("Error eliminando plantilla:", error);
                alert('No se pudo eliminar la plantilla.');
            }
        }
    };

    return (
        <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
                <h2 className="card-title mb-4 flex items-center gap-2"><FaBook /> Gestión de Plantillas</h2>
                <form onSubmit={handleAddPlantilla} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-base-300 pb-6 mb-6">
                    <div className="form-control md:col-span-1">
                        <label className="label"><span className="label-text">Fabricante</span></label>
                        <input 
                            type="text" 
                            list="fabricantes-list"
                            placeholder="Escribe o selecciona"
                            className="input input-bordered" 
                            value={fabricante} 
                            onChange={e => setFabricante(e.target.value)} required />
                        <datalist id="fabricantes-list">
                            {fabricantes.map(f => <option key={f.id} value={f.nombre} />)}
                        </datalist>
                    </div>
                    <div className="form-control md:col-span-2">
                        <label className="label"><span className="label-text">Modelo</span></label>
                        <input type="text" placeholder="Ej: Faldeta 300x400" className="input input-bordered" value={modelo} onChange={e => setModelo(e.target.value)} required />
                    </div>

                    <select className="select select-bordered" value={material} onChange={e => setMaterial(e.target.value)} required>
                        <option value="" disabled>Material</option>
                        {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="select select-bordered" value={espesor} onChange={e => setEspesor(e.target.value)} disabled={!material} required>
                        <option value="" disabled>Espesor</option>
                        {espesoresDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Largo (mm)" className="input input-bordered" value={largo} onChange={e => setLargo(e.target.value)} required />
                        <input type="number" placeholder="Ancho (mm)" className="input input-bordered" value={ancho} onChange={e => setAncho(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-accent md:col-span-3"><FaPlus /> Añadir Plantilla</button>
                </form>
                <div className="max-h-40 overflow-y-auto">
                    <table className="table table-sm">
                        <tbody>
                            {plantillas.map(p => (
                                <tr key={p.id} className="hover">
                                    <td><strong>{p.fabricante}</strong> - {p.modelo}</td>
                                    <td>{p.material} {p.espesor}mm</td>
                                    <td>{p.largo}x{p.ancho}mm</td>
                                    <td><button onClick={() => handleRemove(p.id)} className="btn btn-ghost btn-xs"><FaTrash /></button></td>
                                </tr>
                            ))}
                            {plantillas.length === 0 && <tr><td colSpan="4" className="text-center">Aún no hay plantillas creadas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function NuevoPedido({ plantillas, datosMateriales, onPedidoCreado }) {
    const [cliente, setCliente] = useState('');
    const [productosBorrador, setProductosBorrador] = useState([]);
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    const handleAddProductoAlBorrador = (e) => {
        e.preventDefault();
        if (!productoSeleccionadoId || cantidadProducto < 1) return;

        const plantilla = plantillas.find(p => p.id == productoSeleccionadoId);
        if (!plantilla) return;

        const materialInfo = datosMateriales.find(m => m.material === plantilla.material && m.espesor == plantilla.espesor);
        if (!materialInfo) {
            alert('No se encontraron datos de precio/peso para el material de este producto.');
            return;
        }

        const areaM2 = (plantilla.largo / 1000) * (plantilla.ancho / 1000);
        const precioUnitario = areaM2 * materialInfo.precio;
        const pesoUnitario = areaM2 * materialInfo.peso;

        const nuevoProducto = {
            id: `${Date.now()}-${plantilla.id}`,
            plantillaId: plantilla.id,
            nombre: `${plantilla.fabricante} - ${plantilla.modelo}`,
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
                        <label className="label"><span className="label-text">Plantilla de Producto</span></label>
                        <select className="select select-bordered" value={productoSeleccionadoId} onChange={e => setProductoSeleccionadoId(e.target.value)} required>
                            <option value="" disabled>Seleccionar plantilla...</option>
                            {plantillas.map(p => (
                                <option key={p.id} value={p.id}>{`${p.fabricante} - ${p.modelo} (${p.material} ${p.espesor}mm, ${p.largo}x${p.ancho}mm)`}</option>
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
                    <button onClick={handleSavePedido} className="btn btn-primary" disabled={!cliente || productosBorrador.length === 0}>
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

function EditarPedidoModal({ pedido, plantillas, datosMateriales, onClose, onSave }) {
    const [cliente, setCliente] = useState(pedido.cliente);
    const [productos, setProductos] = useState(pedido.productos);

    // Estado para el formulario de añadir nuevo producto
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    const handleAddProducto = (e) => {
        e.preventDefault();
        if (!productoSeleccionadoId || cantidadProducto < 1) return;

        const plantilla = plantillas.find(p => p.id == productoSeleccionadoId);
        if (!plantilla) return;

        const materialInfo = datosMateriales.find(m => m.material === plantilla.material && m.espesor == plantilla.espesor);
        if (!materialInfo) {
            alert('No se encontraron datos de precio/peso para el material de este producto.');
            return;
        }

        const areaM2 = (plantilla.largo / 1000) * (plantilla.ancho / 1000);
        const precioUnitario = areaM2 * materialInfo.precio;
        const pesoUnitario = areaM2 * materialInfo.peso;

        const nuevoProducto = {
            id: `${Date.now()}-${plantilla.id}`,
            plantillaId: plantilla.id,
            nombre: `${plantilla.fabricante} - ${plantilla.modelo}`,
            cantidad: cantidadProducto,
            precioUnitario,
            pesoUnitario,
        };
        setProductos(prev => [...prev, nuevoProducto]);
        setProductoSeleccionadoId('');
        setCantidadProducto(1);
    };

    const handleRemoveProducto = (id) => {
        setProductos(prev => prev.filter(p => p.id !== id));
    };

    const handleGuardarCambios = () => {
        const pedidoActualizado = {
            ...pedido,
            cliente,
            productos,
        };
        onSave(pedidoActualizado);
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
                <h3 className="font-bold text-lg">Editando Pedido</h3>
                
                <div className="form-control my-4">
                    <label className="label"><span className="label-text">Nombre del Cliente</span></label>
                    <input type="text" className="input input-bordered w-full" value={cliente} onChange={(e) => setCliente(e.target.value)} />
                </div>

                <div className="divider">Productos</div>
                <ul className="menu bg-base-200 rounded-box mb-4">
                    {productos.map(p => (
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
                        <label className="label"><span className="label-text">Añadir Plantilla</span></label>
                        <select className="select select-bordered" value={productoSeleccionadoId} onChange={e => setProductoSeleccionadoId(e.target.value)} required>
                            <option value="" disabled>Seleccionar...</option>
                            {plantillas.map(p => (
                                <option key={p.id} value={p.id}>{`${p.fabricante} - ${p.modelo} (${p.material} ${p.espesor}mm, ${p.largo}x${p.ancho}mm)`}</option>
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
    const [plantillas, setPlantillas] = useState([]);
    const [fabricantes, setFabricantes] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pedidoEnEdicion, setPedidoEnEdicion] = useState(null);

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
            const [plantillasRes, pedidosRes, fabricantesRes] = await Promise.all([
                fetch('/api/plantillas'),
                fetch('/api/pedidos'),
                fetch('/api/fabricantes')
            ]);
            if (!plantillasRes.ok || !pedidosRes.ok || !fabricantesRes.ok) {
                throw new Error('Error al cargar los datos del servidor');
            }
            setPlantillas(await plantillasRes.json());
            setPedidos(await pedidosRes.json());
            setFabricantes(await fabricantesRes.json());
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

            <PlantillasManager plantillas={plantillas} fabricantes={fabricantes} onUpdate={fetchData} datosMateriales={datosMateriales} />

            <NuevoPedido plantillas={plantillas} datosMateriales={datosMateriales} onPedidoCreado={fetchData} />

            <PedidosHistorial pedidos={pedidos} onUpdate={fetchData} onEdit={setPedidoEnEdicion} />

            {pedidoEnEdicion && (
                <EditarPedidoModal 
                    pedido={pedidoEnEdicion}
                    plantillas={plantillas}
                    datosMateriales={datosMateriales}
                    onClose={() => setPedidoEnEdicion(null)}
                    onSave={handleGuardarEdicion}
                />
            )}
        </main>
    );
}

function PedidoCard({ pedido, onToggle, onDelete, onEdit }) {
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