"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, Truck, FileText } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PedidoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const { data: order, error: orderError, isLoading } = useSWR(id ? `/api/pedidos/${id}` : null, fetcher);

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
        const res = await fetch(`/api/pedidos/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...order, estado: newStatus }) // Envía todo el pedido con el nuevo estado
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al actualizar estado');
        }
        mutate(`/api/pedidos/${id}`); // Recarga este pedido
        mutate('/api/pedidos'); // Recarga la lista
      } catch (err) {
        setError(err.message);
      }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (orderError || !order) {
      if (orderError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el pedido.</div>;
  }

  const { subtotal, tax, total } = order;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary">
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        {order.presupuestoId && (
            <Link href={`/presupuestos/${order.presupuestoId}`} className="btn btn-outline btn-accent">
                <FileText className="w-4 h-4" /> Ver Presupuesto
            </Link>
        )}
        <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
          {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      {/* Detalles del Pedido */}
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Pedido {order.numero}</h1>
            <p className="text-gray-500">Fecha: {new Date(order.fechaCreacion).toLocaleDateString()}</p>
             <div className="dropdown dropdown-hover mt-2">
                <div tabIndex={0} role="button" className={`badge ${order.estado === 'Completado' ? 'badge-success' : (order.estado === 'Enviado' ? 'badge-info' : 'badge-warning')}`}>
                    {order.estado}
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => handleUpdateStatus('Pendiente')}>Pendiente</a></li>
                    <li><a onClick={() => handleUpdateStatus('Enviado')}>Enviado</a></li>
                    <li><a onClick={() => handleUpdateStatus('Completado')}>Completado</a></li>
                </ul>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{order.cliente.nombre}</h2>
            <p>{order.cliente.direccion}</p>
            <p>{order.cliente.email}</p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Items */}
        <div className="overflow-x-auto mt-6">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="font-medium">{item.descripcion}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice.toFixed(2)} €</td>
                  <td>{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mt-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between"><span>Subtotal</span> <span>{subtotal.toFixed(2)} €</span></div>
            <div className="flex justify-between"><span>IVA (21%)</span> <span>{tax.toFixed(2)} €</span></div>
            <div className="flex justify-between font-bold text-lg"><span>Total</span> <span>{total.toFixed(2)} €</span></div>
          </div>
        </div>
        
        {order.notes && (
          <div className="mt-6">
            <h3 className="font-bold">Notas:</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
