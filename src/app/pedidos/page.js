"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Package, Search } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PedidosPage() {
  const { data: pedidos, error, isLoading } = useSWR('/api/pedidos', fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar los pedidos.</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><Package className="mr-2" /> Pedidos</h1>
        {/* Los pedidos se crean desde presupuestos, por lo que no hay botón "Nuevo" */}
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
                  <span className={`badge ${order.estado === 'Completado' ? 'badge-success' : 'badge-warning'}`}>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
