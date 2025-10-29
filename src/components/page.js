'use client';

import { useState, useEffect } from 'react';
import { FaClipboardList, FaPlus, FaTrash, FaFilePdf, FaCheck, FaUndo } from 'react-icons/fa';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function PedidosClientesPage() {
    const [pedidos, setPedidos] = useState([]);
    const [cliente, setCliente] = useState('');
    const [detalles, setDetalles] = useState('');

    useEffect(() => {
        try {
            const pedidosGuardados = JSON.parse(localStorage.getItem('pedidosClientesHistorial')) || [];
            setPedidos(pedidosGuardados);
        } catch (e) {
            console.error("Error al cargar pedidos de clientes desde localStorage", e);
            setPedidos([]);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('pedidosClientesHistorial', JSON.stringify(pedidos));
    }, [pedidos]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!cliente.trim() || !detalles.trim()) return;

        const nuevoPedido = {
            id: Date.now(),
            cliente,
            detalles,
            fecha: new Date().toISOString(),
            estado: 'Pendiente',
        };

        setPedidos(prev => [nuevoPedido, ...prev]);
        setCliente('');
        setDetalles('');
    };

    const handleToggleEstado = (id) => {
        setPedidos(pedidos.map(p => {
            if (p.id === id) {
                return { ...p, estado: p.estado === 'Pendiente' ? 'Completado' : 'Pendiente' };
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
        doc.text("Listado de Pedidos de Clientes", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${currentDate}`, 14, 30);

        const head = [["Fecha", "Cliente", "Detalles", "Estado"]];
        const body = pedidos.map(p => [
            new Date(p.fecha).toLocaleDateString('es-ES'),
            p.cliente,
            p.detalles,
            p.estado,
        ]);

        doc.autoTable({ startY: 40, head, body, theme: 'striped', headStyles: { fillColor: [40, 167, 69] } });

        doc.save(`Pedidos_Clientes_${currentDate.replace(/\//g, '-')}.pdf`);
    };

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaClipboardList /> Pedidos de Clientes
            </h1>

            <div className="card bg-base-100 shadow-xl mb-8">
                <form onSubmit={handleSubmit} className="card-body">
                    <h2 className="card-title mb-4">Añadir Nuevo Pedido</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Nombre del Cliente"
                            className="input input-bordered md:col-span-1"
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Detalles del pedido (ej: 2 faldetas 1200x800 SBR 3mm)"
                            className="input input-bordered md:col-span-2"
                            value={detalles}
                            onChange={(e) => setDetalles(e.target.value)}
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
                                    <th>Cliente</th>
                                    <th>Detalles</th>
                                    <th className="text-center">Estado</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => (
                                    <tr key={p.id} className={`hover ${p.estado === 'Completado' ? 'opacity-50' : ''}`}>
                                        <td>{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                                        <td>{p.cliente}</td>
                                        <td className="whitespace-pre-wrap">{p.detalles}</td>
                                        <td className="text-center">
                                            <span className={`badge ${p.estado === 'Completado' ? 'badge-success' : 'badge-warning'}`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="text-center space-x-1">
                                            <button onClick={() => handleToggleEstado(p.id)} className="btn btn-ghost btn-xs" title={p.estado === 'Pendiente' ? 'Marcar como Completado' : 'Marcar como Pendiente'}>
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

export default PedidosClientesPage;