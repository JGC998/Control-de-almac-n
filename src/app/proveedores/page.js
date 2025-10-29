'use client';

import { useState, useEffect } from 'react';
import { FaTruck, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function PedidosProveedoresPage() {
    const [pedidos, setPedidos] = useState([]);
    const [proveedor, setProveedor] = useState('');
    const [material, setMaterial] = useState('');

    useEffect(() => {
        try {
            const pedidosGuardados = JSON.parse(localStorage.getItem('pedidosProveedoresHistorial')) || [];
            setPedidos(pedidosGuardados);
        } catch (e) {
            console.error("Error al cargar pedidos a proveedores desde localStorage", e);
            setPedidos([]);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('pedidosProveedoresHistorial', JSON.stringify(pedidos));
    }, [pedidos]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!proveedor.trim() || !material.trim()) return;

        const nuevoPedido = {
            id: Date.now(),
            proveedor,
            material,
            fecha: new Date().toISOString(),
            estado: 'Pendiente',
        };

        setPedidos(prev => [nuevoPedido, ...prev]);
        setProveedor('');
        setMaterial('');
    };

    const handleToggleEstado = (id) => {
        setPedidos(pedidos.map(p => {
            if (p.id === id) {
                return { ...p, estado: p.estado === 'Pendiente' ? 'Recibido' : 'Pendiente' };
            }
            return p;
        }));
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
            setPedidos(pedidos.filter(p => p.id !== id));
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
        doc.text("Listado de Pedidos a Proveedores", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${currentDate}`, 14, 30);

        const head = [["Fecha", "Proveedor", "Material Solicitado", "Estado"]];
        const body = pedidos.map(p => [
            new Date(p.fecha).toLocaleDateString('es-ES'),
            p.proveedor,
            p.material,
            p.estado,
        ]);

        doc.autoTable({ startY: 40, head, body, theme: 'striped', headStyles: { fillColor: [40, 167, 69] } });

        doc.save(`Pedidos_Proveedores_${currentDate.replace(/\//g, '-')}.pdf`);
    };

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaTruck /> Pedidos a Proveedores
            </h1>

            <div className="card bg-base-100 shadow-xl mb-8">
                <form onSubmit={handleSubmit} className="card-body">
                    <h2 className="card-title mb-4">Añadir Nuevo Pedido</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Nombre del Proveedor"
                            className="input input-bordered md:col-span-1"
                            value={proveedor}
                            onChange={(e) => setProveedor(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Material y cantidad (ej: 50m² Goma SBR 3mm)"
                            className="input input-bordered md:col-span-2"
                            value={material}
                            onChange={(e) => setMaterial(e.target.value)}
                            required
                        />
                    </div>
                    <div className="card-actions justify-end mt-4">
                        <button type="submit" className="btn btn-primary"><FaPlus /> Añadir Pedido</button>
                    </div>
                </form>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="card-title">Historial de Pedidos</h2>
                        <button onClick={handleExportarPDF} className="btn btn-accent btn-sm"><FaFilePdf /> Exportar a PDF</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Proveedor</th>
                                    <th>Material</th>
                                    <th className="text-center">Estado</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => (
                                    <tr key={p.id} className={`hover ${p.estado === 'Recibido' ? 'opacity-50' : ''}`}>
                                        <td>{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                                        <td>{p.proveedor}</td>
                                        <td className="whitespace-pre-wrap">{p.material}</td>
                                        <td className="text-center">
                                            <span className={`badge ${p.estado === 'Recibido' ? 'badge-success' : 'badge-warning'}`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="text-center space-x-1">
                                            <button onClick={() => handleToggleEstado(p.id)} className="btn btn-ghost btn-xs" title={p.estado === 'Pendiente' ? 'Marcar como Recibido' : 'Marcar como Pendiente'}>
                                                {p.estado === 'Pendiente' ? <FaCheck /> : <FaUndo />}
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="btn btn-ghost btn-xs text-error" title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pedidos.length === 0 && (
                                    <tr><td colSpan="5" className="text-center">No hay pedidos registrados.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default PedidosProveedoresPage;
