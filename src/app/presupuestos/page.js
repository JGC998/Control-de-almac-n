"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { PlusCircle, FileText, Search } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PresupuestosPage() {
  const { data: presupuestos, error, isLoading } = useSWR('/api/presupuestos', fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar los presupuestos.</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2" /> Presupuestos</h1>
        <Link href="/presupuestos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Presupuesto
        </Link>
      </div>

      {/* TODO: Añadir filtro por cliente o estado */}
      
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
            {presupuestos && presupuestos.map((quote) => (
              <tr key={quote.id} className="hover">
                <td>
                  <Link href={`/presupuestos/${quote.id}`} className="link link-primary font-bold">
                    {quote.numero}
                  </Link>
                </td>
                <td>{quote.cliente?.nombre || 'N/A'}</td>
                <td>{new Date(quote.fechaCreacion).toLocaleDateString()}</td>
                <td>{quote.total.toFixed(2)} €</td>
                <td>
                  <span className={`badge ${quote.estado === 'Aceptado' ? 'badge-success' : 'badge-warning'}`}>
                    {quote.estado}
                  </span>
                </td>
                <td>
                  <Link href={`/presupuestos/${quote.id}`} className="btn btn-sm btn-outline">
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
