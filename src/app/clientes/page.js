'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo, FaBook, FaBoxOpen } from 'react-icons/fa';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatWeight } from '@/utils/utils';

function PedidosClientesPage() {
    const [pedidos, setPedidos] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [datosMateriales, setDatosMateriales] = useState([]);

    // Estado para el formulario de nuevo pedido (borrador)
    const [cliente, setCliente] = useState('');
    const [productosBorrador, setProductosBorrador] = useState([]);

    // --- Estados para el formulario de PRODUCTO DE CATÁLOGO ---
    const [nombreProductoCat, setNombreProductoCat] = useState('');
    const [materialProductoCat, setMaterialProductoCat] = useState('');
    const [espesorProductoCat, setEspesorProductoCat] = useState('');
    const [largoProductoCat, setLargoProductoCat] = useState('');
    const [anchoProductoCat, setAnchoProductoCat] = useState('');

    // --- Estados para el formulario de AÑADIR PRODUCTO AL PEDIDO ---
    const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
    const [cantidadProducto, setCantidadProducto] = useState(1);

    // --- Carga de datos ---
    useEffect(() => {
        const fetchMateriales = async () => {
            try {
                const response = await fetch('/data/precios.json');
                if (!response.ok) throw new Error('No se pudo cargar precios.json');
                const data = await response.json();
                setDatosMateriales(data);
            } catch (error) {
                console.error('Error fetching materiales:', error);
            }
        };
        fetchMateriales();
    }, []);

    // Carga inicial de datos desde las APIs
    useEffect(() => {
        const loadData = async () => {
            try {
                const [catalogoRes, pedidosRes] = await Promise.all([
                    fetch('/api/catalogo'),
                    fetch('/api/pedidos')
                ]);
                if (!catalogoRes.ok || !pedidosRes.ok) {
                    throw new Error('Error al cargar los datos del servidor');
                }
                const catalogoData = await catalogoRes.json();
                const pedidosData = await pedidosRes.json();
                setCatalogo(catalogoData);
                setPedidos(pedidosData);
            } catch (error) {
                console.error("Fallo al cargar datos:", error);
                // Opcional: mostrar un toast/alerta al usuario
            }
        };
        loadData();
    }, []);

    // --- Lógica del Catálogo de Productos ---
    const handleAddProductoCatalogo = async (e) => {
        e.preventDefault();
        if (!nombreProductoCat || !materialProductoCat || !espesorProductoCat || !largoProductoCat || !anchoProductoCat) {
            alert('Todos los campos del producto son obligatorios.');
            return;
        }
        const nuevoProductoCatalogo = {
            id: Date.now(),
            nombre: nombreProductoCat,
            material: materialProductoCat,
            espesor: espesorProductoCat,
            largo: largoProductoCat,
            ancho: anchoProductoCat,
        };
        const nuevoCatalogo = [nuevoProductoCatalogo, ...catalogo];
        setCatalogo(nuevoCatalogo);
        try {
            await fetch('/api/catalogo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoCatalogo)
            });
        } catch (error) { console.error("Error guardando catálogo:", error); }

        // Reset form
        setNombreProductoCat('');
        setMaterialProductoCat('');
        setEspesorProductoCat('');
        setLargoProductoCat('');
        setAnchoProductoCat('');
    };

    const handleRemoveProductoCatalogo = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este producto del catálogo?')) {
            const nuevoCatalogo = catalogo.filter(p => p.id !== id);
            setCatalogo(nuevoCatalogo);
            try {
                await fetch('/api/catalogo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoCatalogo)
                });
            } catch (error) { console.error("Error eliminando del catálogo:", error); }
        }
    };

    // --- Lógica de Pedidos ---
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
        setProductosBorrador([...productosBorrador, nuevoProducto]);
        setProductoSeleccionadoId('');
        setCantidadProducto(1);
    };

    const handleRemoveProductoBorrador = (id) => {
        setProductosBorrador(productosBorrador.filter(p => p.id !== id));
    };

    const handleSavePedido = async () => {
        if (!cliente.trim() || productosBorrador.length === 0) {
            alert('Debe especificar un cliente y añadir al menos un producto.');
            return;
        }

        const nuevoPedido = {
            id: Date.now(),
            cliente,
            productos: productosBorrador,
            fecha: new Date().toISOString(),
            estado: 'Activo', // 'Activo' o 'Completado'
        };

        const nuevosPedidos = [nuevoPedido, ...pedidos];
        setPedidos(nuevosPedidos);
        try {
            await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevosPedidos)
            });
        } catch (error) { console.error("Error guardando pedido:", error); }

        // Limpiar formulario
        setCliente('');
        setProductosBorrador([]);
    };

    const handleToggleEstado = async (id) => {
        const nuevosPedidos = pedidos.map(p => {
            if (p.id === id) {
                return { ...p, estado: p.estado === 'Activo' ? 'Completado' : 'Activo' };
            }
            return p;
        });
        setPedidos(nuevosPedidos);
        try {
            await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevosPedidos)
            });
        } catch (error) { console.error("Error actualizando estado del pedido:", error); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
            const nuevosPedidos = pedidos.filter(p => p.id !== id);
            setPedidos(nuevosPedidos);
            try {
                await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevosPedidos)
                });
            } catch (error) { console.error("Error eliminando pedido:", error); }
        }
    };

    const handleExportarPDF = () => {
        if (pedidos.length === 0) {
            alert('No hay pedidos para exportar.');
            return;
        }

        const doc = new jsPDF(); // Esto puede dar error si no se importa bien
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

    // --- Datos para Selects y Memos ---
    const materialesUnicos = useMemo(() => [...new Set(datosMateriales.map(item => item.material))], [datosMateriales]);
    const espesoresDisponibles = useMemo(() => {
        if (materialProductoCat) {
            return datosMateriales
                .filter(item => item.material === materialProductoCat)
                .map(item => item.espesor);
        }
        return [];
    }, [materialProductoCat, datosMateriales]);

    const pedidosActivos = useMemo(() => pedidos.filter(p => p.estado === 'Activo'), [pedidos]);
    const pedidosCompletados = useMemo(() => pedidos.filter(p => p.estado === 'Completado'), [pedidos]);

    const totalesBorrador = useMemo(() => productosBorrador.reduce((acc, p) => {
        acc.precio += p.precioUnitario * p.cantidad;
        acc.peso += p.pesoUnitario * p.cantidad;
        return acc;
    }, { precio: 0, peso: 0 }), [productosBorrador]);

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaClipboardList /> Pedidos de Clientes
            </h1>

            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title mb-4 flex items-center gap-2"><FaBook /> Catálogo de Productos</h2>
                    <form onSubmit={handleAddProductoCatalogo} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-base-300 pb-6 mb-6">
                        <input type="text" placeholder="Nombre del Producto (ej: Faldeta Estándar)" className="input input-bordered md:col-span-3" value={nombreProductoCat} onChange={e => setNombreProductoCat(e.target.value)} required />
                        <select className="select select-bordered" value={materialProductoCat} onChange={e => setMaterialProductoCat(e.target.value)} required>
                            <option value="" disabled>Material</option>
                            {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className="select select-bordered" value={espesorProductoCat} onChange={e => setEspesorProductoCat(e.target.value)} disabled={!materialProductoCat} required>
                            <option value="" disabled>Espesor</option>
                            {espesoresDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <div className="md:col-span-1 grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Largo (mm)" className="input input-bordered" value={largoProductoCat} onChange={e => setLargoProductoCat(e.target.value)} required />
                            <input type="number" placeholder="Ancho (mm)" className="input input-bordered" value={anchoProductoCat} onChange={e => setAnchoProductoCat(e.target.value)} required />
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
                                        <td><button onClick={() => handleRemoveProductoCatalogo(p.id)} className="btn btn-ghost btn-xs"><FaTrash /></button></td>
                                    </tr>
                                ))}
                                {catalogo.length === 0 && <tr><td colSpan="4" className="text-center">Aún no hay productos en el catálogo.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title mb-4 flex items-center gap-2"><FaBoxOpen /> Nuevo Pedido</h2>
                    <div className="form-control mb-4">
                        <label className="label"><span className="label-text">Nombre del Cliente</span></label>
                        <input
                            type="text"
                            placeholder="Nombre del Cliente"
                            className="input input-bordered w-full"
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                        />
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

            {/* Historial de Pedidos */}
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
        </main>
    );
}

function PedidoCard({ pedido, onToggle, onDelete }) {
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
                            <button onClick={() => onToggle(pedido.id)} className="btn btn-success btn-sm" title="Marcar como Completado"><FaCheck /> Completar</button>
                        ) : (
                            <button onClick={() => onToggle(pedido.id)} className="btn btn-warning btn-sm" title="Marcar como Activo"><FaUndo /> Reactivar</button>
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