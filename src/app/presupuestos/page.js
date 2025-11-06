import React from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Search } from 'lucide-react';
import { db } from '@/lib/db'; 

export default async function PresupuestosPage() {
  
  // 1. Obtener todos los datos ordenados por fecha de creación descendente
  const allPresupuestos = await db.presupuesto.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    orderBy: { fechaCreacion: 'desc' },
  });
  
  // 2. Aplicar ordenamiento secundario en memoria por estado: Borrador, Aceptado, otros.
  const sortOrder = ['Borrador', 'Aceptado'];

  const presupuestos = allPresupuestos.sort((a, b) => {
      // Si los estados son iguales, mantenemos el orden por fecha (desc) que vino de la DB
      if (a.estado === b.estado) return 0; 
      
      const aIndex = sortOrder.indexOf(a.estado);
      const bIndex = sortOrder.indexOf(b.estado);

      // Borradores y Aceptados primero
      if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex; // Borrador (0) antes de Aceptado (1)
      }
      // Los estados que no estén en la lista (e.g., 'Rechazado') van al final
      if (aIndex === -1 && bIndex !== -1) return 1; // b (definido) va primero
      if (aIndex !== -1 && bIndex === -1) return -1; // a (definido) va primero
      
      return 0; // Mantiene el orden de fecha si ambos son 'otros'
  });


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2" /> Presupuestos</h1>
        <Link href="/presupuestos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Presupuesto
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
            {presupuestos.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center">No hay presupuestos creados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
