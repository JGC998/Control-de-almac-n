import React from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, Search, CheckCircle, Clock } from 'lucide-react';
import { db } from '@/lib/db'; 
// Se elimina la importación de revalidatePath

// Función auxiliar para renderizar la tabla (Reutilizada y Adaptada)
const PresupuestosTable = ({ quotes, title, icon: Icon, isCollapsible = false }) => {
    if (quotes.length === 0 && !isCollapsible) {
        return <p className="text-gray-500 p-4">No hay {title.toLowerCase()} actualmente.</p>;
    }
    
    if (quotes.length === 0 && isCollapsible) return null;

    const tableContent = (
      <div className="overflow-x-auto">
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
            {quotes.map((quote) => (
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
                  <span className={`badge ${quote.estado === 'Aceptado' ? 'badge-info' : 'badge-warning'}`}>
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
    );
    
    if (isCollapsible) {
        return (
            <div className="collapse collapse-arrow bg-base-200 mt-4">
              <input type="checkbox" defaultChecked /> 
              <div className="collapse-title text-xl font-medium flex items-center gap-2">
                <Icon className="w-5 h-5" /> {title} ({quotes.length})
              </div>
              <div className="collapse-content p-0">
                {tableContent}
              </div>
            </div>
        );
    }

    return (
        <div className="bg-base-100 shadow-xl rounded-lg p-4">
            <h2 className="text-2xl font-bold flex items-center mb-4"><Icon className="mr-2" /> {title}</h2>
            {tableContent}
        </div>
    );
};


export default async function PresupuestosPage() {
  
  // FIX: Se elimina revalidatePath para solucionar el error de Runtime.
  
  // 1. Obtener todos los datos ordenados por fecha de creación descendente
  const allPresupuestos = await db.presupuesto.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    orderBy: { fechaCreacion: 'desc' }, // Ordenación por fecha inicial
  });

  const presupuestosAceptados = allPresupuestos.filter(p => p.estado === 'Aceptado');
  const presupuestosBorrador = allPresupuestos.filter(p => p.estado === 'Borrador');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><FileText className="mr-2" /> Presupuestos</h1>
        <Link href="/presupuestos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Presupuesto
        </Link>
      </div>
      
      <div className="space-y-4">
        <PresupuestosTable 
            quotes={presupuestosAceptados} 
            title="Aceptados" 
            icon={CheckCircle}
            isCollapsible={true}
        />
        <PresupuestosTable 
            quotes={presupuestosBorrador} 
            title="Borradores" 
            icon={Clock} 
            isCollapsible={true}
        />
      </div>
    </div>
  );
}
