import React from 'react';
import Link from 'next/link';
import { Package, Search, PlusCircle } from 'lucide-react'; // Importar PlusCircle
import { db } from '@/lib/db'; // Importar DB

// Convertido a React Server Component (RSC)
export default async function PedidosPage() {
  
  // Obtenemos datos directamente en el servidor
  const pedidos = await db.pedido.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    orderBy: { fechaCreacion: 'desc' },
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><Package className="mr-2" /> Pedidos</h1>
        {/* Enlace a la página de nuevo pedido (creada en un script anterior) */}
        <Link href="/pedidos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Pedido
        </Link>
      </div>
      
      <div className="overflow-x-auto bg-base-100 shadow-xl rounded-lg">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos && pedidos.map((order) => (
              <tr key={order.id} className="hover">
                <td>
                  <Link href={`/pedidos/${order.id}`} className="link link-primary font-bold">
                    {order.numero}
                  </Link>
                </td>
                <td>{order.cliente?.nombre || 'N/A'}</td>
                <td>{new Date(order.fechaCreacion).toLocaleDateString()}</td>
                <td>{order.total.toFixed(2)} €</td>
                <td>
                  <span className={`badge ${order.estado === 'Completado' ? 'badge-success' : (order.estado === 'Enviado' ? 'badge-info' : 'badge-warning')}`}>
                    {order.estado}
                  </span>
                </td>
                <td>
                  <Link href={`/pedidos/${order.id}`} className="btn btn-sm btn-outline">
                    Ver <Search className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center">No hay pedidos creados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
