'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, notFound, useParams } from 'next/navigation';

// Funciones de formato
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-ES');
const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);

async function getPresupuesto(id) {
  const res = await fetch(`/api/presupuestos/${id}`)
  if (!res.ok) {
    return notFound();
  }
  return res.json();
}

async function getClient(id) {
    const res = await fetch(`/api/clientes/${id}`)
    if (!res.ok) {
      return null;
    }
    return res.json();
}

export default function PresupuestoDetailPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      const quoteData = await getPresupuesto(id);
      setQuote(quoteData);
      if (quoteData && quoteData.clienteId) {
        const clientData = await getClient(quoteData.clienteId);
        setClient(clientData);
      }
      setIsLoading(false);
    };

    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      try {
        const res = await fetch(`/api/presupuestos/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Error al eliminar');
        router.push('/presupuestos');
        router.refresh();
      } catch (error) {
        console.error('Error al eliminar el presupuesto:', error);
        alert('No se pudo eliminar el presupuesto.');
      }
    }
  };

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/pedidos/from-presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuestoId: id }),
      });
      if (!res.ok) throw new Error('Error al crear el pedido');
      const newOrder = await res.json();
      router.push(`/pedidos/${newOrder.id}`);
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      alert('No se pudo crear el pedido a partir del presupuesto.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return <main className="p-4 sm:p-6 lg:p-8"><div className="max-w-4xl mx-auto text-center"><span className="loading loading-lg"></span></div></main>;
  }

  if (!quote) {
    return notFound();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 bg-base-200">
      <div className="max-w-4xl mx-auto">
        {/* Barra de Acciones */}
        <div className="flex items-center justify-between mb-4">
            <Link href="/presupuestos" className="btn btn-ghost">← Volver a Presupuestos</Link>
            <div className="space-x-2">
                <Link href={`/presupuestos/${id}/editar`} className="btn btn-outline">Editar</Link>
                <button onClick={handleDelete} className="btn btn-error btn-outline">Eliminar</button>
                <Link href={`/api/presupuestos/${id}/pdf`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  Generar PDF
                </Link>
                <button 
                  onClick={handleCreateOrder} 
                  className="btn btn-success"
                  disabled={quote.estado === 'Aceptado' || isCreatingOrder}
                >
                  {isCreatingOrder ? 'Creando Pedido...' : 'Crear Pedido'}
                </button>
            </div>
        </div>

        {/* Vista del Presupuesto */}
        <div className="bg-base-100 shadow-lg rounded-lg p-8 sm:p-12">
          {/* Cabecera */}
          <div className="grid grid-cols-2 items-start mb-12">
            <div>
              <h1 className="text-2xl font-bold">{process.env.COMPANY_NAME || 'Tu Empresa'}</h1>
              <p className="text-base-content/70">{process.env.COMPANY_ADDRESS || 'Tu Dirección'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold uppercase text-base-content/80">Presupuesto</h2>
              <p className="font-mono">{quote.numero}</p>
              <p className="mt-2 text-sm"><span className="font-bold">Fecha:</span> {formatDate(quote.fechaCreacion)}</p>
              <p className="text-sm"><span className="font-bold">Estado:</span> <span className="badge badge-lg">{quote.estado}</span></p>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-12">
            <h3 className="font-bold">Cliente:</h3>
            {client ? (
              <div className="text-base-content/80">
                <p className="font-bold text-lg">{client.nombre}</p>
                <p>{client.direccion}</p>
                <p>{client.telefono}</p>
                <p>{client.email}</p>
              </div>
            ) : <p>Cliente no encontrado</p>}
          </div>

          {/* Tabla de Items */}
          <table className="table w-full mb-8">
            <thead className="bg-base-200">
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-right">Precio Unit.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales y Notas */}
          <div className="grid grid-cols-2 gap-8">
            <div className="text-base-content/80">
                <h3 className="font-bold mb-2">Notas:</h3>
                <p className="text-sm">{quote.notes || 'No se añadieron notas.'}</p>
            </div>
            <div className="space-y-2 text-right">
                <div className="flex justify-between"><span className="text-base-content/70">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-base-content/70">IVA (21%)</span><span>{formatCurrency(quote.tax)}</span></div>
                <div className="divider my-1"></div>
                <div className="flex justify-between font-bold text-xl"><span >TOTAL</span><span>{formatCurrency(quote.total)}</span></div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
