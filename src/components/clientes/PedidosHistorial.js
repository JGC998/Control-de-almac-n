'use client';
import { useMemo } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from 'react-icons/fa';
import PedidoCard from './PedidoCard'; // Importamos el componente recién creado

export default function PedidosHistorial({ pedidos, clientes, onUpdate, onEdit }) {
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
        const clientMap = new Map(clientes.map(c => [c.id, c.nombre]));

        doc.setFontSize(22);
        doc.setTextColor(40, 167, 69);
        doc.text("Listado de Pedidos de Clientes", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${currentDate}`, 14, 30);

        const head = [["Fecha", "Cliente", "Detalles", "Estado"]];
        const body = pedidos.map(p => {
            const clienteNombre = p.clienteId ? clientMap.get(p.clienteId) : p.cliente;
            const productos = p.productos || p.items || [];
            const fecha = new Date(p.fechaCreacion || p.fecha).toLocaleDateString('es-ES');
            return [
                fecha,
                clienteNombre,
                productos.map(prod => `${prod.cantidad} x ${prod.nombre || prod.descripcion}`).join('\n'),
                p.estado,
            ];
        });

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
                        {pedidosActivos.map(p => <PedidoCard key={p.id} pedido={p} clientes={clientes} onToggle={handleToggleEstado} onDelete={handleDelete} onEdit={onEdit} />)}
                        {pedidosActivos.length === 0 && <p className="text-center p-4">No hay pedidos activos.</p>}
                    </div>
                </div>

                <div className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" />
                    <div className="collapse-title text-xl font-medium">
                        Pedidos Completados ({pedidosCompletados.length})
                    </div>
                    <div className="collapse-content">
                        {pedidosCompletados.map(p => <PedidoCard key={p.id} pedido={p} clientes={clientes} onToggle={handleToggleEstado} onDelete={handleDelete} onEdit={onEdit} />)}
                        {pedidosCompletados.length === 0 && <p className="text-center p-4">No hay pedidos completados.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
