"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, Truck, FileText, DollarSign, CheckCircle } from 'lucide-react';
import ClientOrderForm from '@/components/ClientOrderForm';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para manejar el desglose del total y los cálculos por item.
const PedidoTotalsAndItems = ({ order }) => {
    const ivaRate = 0.21; // Asumimos un 21% si no hay configuración

    const items = order.items || [];

    // Calcular totales basados en los precios directos de los items
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const impuestos = subtotal * ivaRate;
    const total = subtotal + impuestos;
    const pesoTotalGlobal = items.reduce((acc, item) => acc + (item.quantity * (item.pesoUnitario || 0)), 0);

    return (
        <div className="flex flex-wrap md:flex-nowrap justify-between gap-6">
            {/* Columna de ítems */}
            <div className="flex-1 overflow-x-auto">
                <table className="table table-zebra w-full">
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Peso U.</th>
                            <th>Peso Total</th>
                            <th>P. Unit. (Costo)</th>
                            <th>Total (Costo)</th>
                            <th className="text-success">P. Unit. (Venta)</th>
                            <th className="text-success text-right">Total (Venta)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const costoUnitario = item.producto?.costoUnitario || 0;
                            const totalCosto = item.quantity * costoUnitario;
                            const totalVenta = item.quantity * item.unitPrice;

                            return (
                                <tr key={index}>
                                    <td className="font-medium min-w-[200px]">{item.descripcion}</td>
                                    <td>{item.quantity}</td>
                                    <td>{(item.pesoUnitario || 0).toFixed(2)} kg</td>
                                    <td>{((item.quantity || 0) * (item.pesoUnitario || 0)).toFixed(2)} kg</td>
                                    <td>{costoUnitario.toFixed(2)} €</td>
                                    <td>{totalCosto.toFixed(2)} €</td>
                                    <td className="font-bold text-success">{item.unitPrice.toFixed(2)} €</td>
                                    <td className="font-bold text-success text-right">{totalVenta.toFixed(2)} €</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Columna de Totales */}
            <div className="w-full md:max-w-xs space-y-2">
                <div className="divider">Resumen</div>
                
                <div className="flex justify-between font-semibold text-info">
                    <span>Peso Total Global</span> 
                    <span>{pesoTotalGlobal.toFixed(2)} kg</span>
                </div>

                <div className="divider my-1"></div>

                <div className="flex justify-between">
                    <span>Subtotal</span> 
                    <span>{subtotal.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                    <span>Impuestos ({(ivaRate * 100).toFixed(0)}%)</span> 
                    <span>{impuestos.toFixed(2)} €</span>
                </div>
                
                <div className="divider my-1"></div>
                
                <div className="flex justify-between font-bold text-xl text-primary">
                    <span>TOTAL</span> 
                    <span>{total.toFixed(2)} €</span>
                </div>
            </div>
        </div>
    );
};


export default function PedidoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const { data: order, error: orderError, isLoading: orderLoading, mutate } = useSWR(id ? `/api/pedidos/${id}` : null, fetcher);


  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      setIsDeleting(true);
      setError(null);
      try {
        const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar');
        }
        mutate('/api/pedidos'); // Actualiza la lista
        router.push('/pedidos'); // Vuelve a la lista
      } catch (err) {
        setError(err.message);
        setIsDeleting(false);
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/pedidos/${id}/pdf`);
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedido-${order.numero}.pdf`;
      document.body.appendChild(a);
a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
     try {
        const { subtotal, tax, total } = order;
        
        const res = await fetch(`/api/pedidos/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...order, 
                estado: newStatus,
                items: order.items,
                subtotal, tax, total 
            }) 
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al actualizar estado');
        }
        mutate(`/api/pedidos/${id}`);
        router.refresh();
      } catch (err) {
        setError(err.message);
      }
  };

  const isLoading = orderLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (orderError || !order) {
      if (orderError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el pedido.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary">
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        <button onClick={openEditModal} className="btn btn-outline btn-primary">
          <Edit className="w-4 h-4" /> Editar Pedido
        </button>
        {order.presupuestoId && (
            <Link href={`/presupuestos/${order.presupuestoId}`} className="btn btn-outline btn-accent">
                <FileText className="w-4 h-4" /> Ver Presupuesto
            </Link>
        )}
        {order.estado !== 'Completado' && (
            <button onClick={() => handleUpdateStatus('Completado')} className="btn btn-success">
                <CheckCircle className="w-4 h-4" /> Marcar como Completado
            </button>
        )}
        <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
          {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Pedido {order.numero}</h1>
            <p className="text-gray-500">Fecha: {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : 'N/A'}</p>
             <div className="dropdown dropdown-hover mt-2">
                <div tabIndex={0} role="button" className={`badge ${order.estado === 'Completado' ? 'badge-success' : (order.estado === 'Enviado' ? 'badge-info' : 'badge-warning')}`}>
                    {order.estado}
                </div>
                <ul tabIndex={0} className="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => handleUpdateStatus('Pendiente')}>Pendiente</a></li>
                    <li><a onClick={() => handleUpdateStatus('Enviado')}>Enviado</a></li>
                    <li><a onClick={() => handleUpdateStatus('Completado')}>Completado</a></li>
                </ul>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{order.cliente?.nombre}</h2>
            <p>{order.cliente?.direccion}</p>
            <p>{order.cliente?.email}</p>
          </div>
        </div>

        <div className="divider"></div>

        <PedidoTotalsAndItems order={order} />
        
        <div className="divider"></div>

        <div className="mt-6 bg-base-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">Notas del Pedido</h3>
            <p className="text-base-content whitespace-pre-wrap">
                {order.notas || 'Sin notas registradas.'}
            </p>
        </div>
      </div>

      {/* Modal de Edición del Pedido */}
      <dialog id="edit_pedido_modal" className={`modal ${isEditModalOpen ? 'modal-open' : ''}`}>
          <div className="modal-box w-11/12 max-w-7xl">
              <button onClick={closeEditModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" >✕</button>
              <h3 className="font-bold text-lg mb-4">Editar Pedido {order.numero}</h3>

              <ClientOrderForm 
                  initialData={order} 
                  onSuccess={() => { mutate(`/api/pedidos/${id}`); closeEditModal(); }}
                  onCancel={closeEditModal}
                  isEdit={true}
                  formType="PEDIDO"
              />
          </div>
          <form method="dialog" className="modal-backdrop">
              <button onClick={closeEditModal}>close</button>
          </form>
      </dialog>
    </div>
  );
}