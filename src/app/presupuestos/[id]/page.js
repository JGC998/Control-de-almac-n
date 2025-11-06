"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, CheckCircle, Package } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PresupuestoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const { data: quote, error: quoteError, isLoading } = useSWR(id ? `/api/presupuestos/${id}` : null, fetcher);

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      setIsDeleting(true);
      setError(null);
      try {
        const res = await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar');
        }
        mutate('/api/presupuestos'); // Actualiza la lista
        router.push('/presupuestos'); // Vuelve a la lista
      } catch (err) {
        setError(err.message);
        setIsDeleting(false);
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/presupuestos/${id}/pdf`);
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presupuesto-${quote.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConvertToPedido = async () => {
    if (confirm('¿Estás seguro de que quieres convertir este presupuesto en un pedido? Esta acción no se puede deshacer.')) {
      setIsConverting(true);
      setError(null);
      try {
        const res = await fetch('/api/pedidos/from-presupuesto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presupuestoId: id }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al convertir');
        }
        const newPedido = await res.json();
        // Mutar el presupuesto actual para que muestre "Aceptado"
        mutate(`/api/presupuestos/${id}`);
        // Mutar la lista de pedidos
        mutate('/api/pedidos');
        // Redirigir al nuevo pedido
        router.push(`/pedidos/${newPedido.id}`);
      } catch (err) {
        setError(err.message);
        setIsConverting(false);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (quoteError || !quote) {
      if (quoteError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el presupuesto.</div>;
  }

  const { subtotal, tax, total } = quote;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-6">
        {quote.estado === 'Borrador' && (
          <Link href={`/presupuestos/${id}/editar`} className="btn btn-outline btn-primary">
            <Edit className="w-4 h-4" /> Editar
          </Link>
        )}
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary">
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        {quote.estado === 'Borrador' && (
          <button onClick={handleConvertToPedido} className="btn btn-success" disabled={isConverting}>
            {isConverting ? <span className="loading loading-spinner loading-xs"></span> : <CheckCircle className="w-4 h-4" />}
            Convertir a Pedido
          </button>
        )}
        {quote.estado !== 'Aceptado' && (
           <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
            {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        )}
         {quote.estado === 'Aceptado' && quote.pedido?.id && (
          <Link href={`/pedidos/${quote.pedido.id}`} className="btn btn-success btn-outline">
            <Package className="w-4 h-4" /> Ver Pedido Creado
          </Link>
         )}
      </div>

      {/* Detalles del Presupuesto */}
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Presupuesto {quote.numero}</h1>
            <p className="text-gray-500">Fecha: {new Date(quote.fechaCreacion).toLocaleDateString()}</p>
            <span className={`badge mt-2 ${quote.estado === 'Aceptado' ? 'badge-success' : 'badge-warning'}`}>
              {quote.estado}
            </span>
          </div>
          <div className="text-right">
            {/* CORREGIDO: Usamos encadenamiento opcional (?. ) para evitar el TypeError */}
            <h2 className="text-xl font-bold">{quote.cliente?.nombre}</h2>
            <p>{quote.cliente?.direccion}</p>
            <p>{quote.cliente?.email}</p>
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
              {quote.items.map((item, index) => (
                <tr key={index}>
                  <td className="font-medium">{item.description}</td>
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

        {/* Notas */}
        {quote.notes && (
          <div className="mt-6">
            <h3 className="font-bold">Notas:</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
