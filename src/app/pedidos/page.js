import React from 'react';
import Link from 'next/link';
import { Package, Search, PlusCircle, CheckCircle, Clock } from 'lucide-react'; 
import { db } from '@/lib/db'; 

// Función auxiliar para renderizar la tabla
const PedidosTable = ({ pedidos, title, icon: Icon, isCollapsible = false }) => {
    // Si no hay pedidos, y no es colapsable (pendiente), mostramos mensaje
    if (pedidos.length === 0 && !isCollapsible) {
        return <p className="text-gray-500 p-4">No hay {title.toLowerCase()} actualmente.</p>;
    }
    
    // Si es colapsable y no hay elementos, no mostramos nada
    if (pedidos.length === 0 && isCollapsible) return null;

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
            {pedidos.map((order) => (
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
          </tbody>
        </table>
      </div>
    );
    
    if (isCollapsible) {
        return (
            <div className="collapse collapse-arrow bg-base-200 mt-4">
              {/* FIX: Checkbox para controlar el colapso */}
              <input type="checkbox" /> 
              <div className="collapse-title text-xl font-medium flex items-center gap-2">
                <Icon className="w-5 h-5" /> {title} ({pedidos.length})
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


export default async function PedidosPage() {
  
  // FIX: Se eliminó revalidatePath para solucionar el error de Runtime.
  
  const allPedidos = await db.pedido.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    // Ordenado por fecha de creación descendente
    orderBy: { fechaCreacion: 'desc' }, 
  });

  // Dividir en Activos (Pendiente o Enviado) e Históricos (Completado o Cancelado)
  const pedidosActivos = allPedidos.filter(p => p.estado !== 'Completado' && p.estado !== 'Cancelado');
  const pedidosCompletados = allPedidos.filter(p => p.estado === 'Completado' || p.estado === 'Cancelado');

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><Package className="mr-2" /> Pedidos</h1>
        <Link href="/pedidos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Pedido
        </Link>
      </div>
      
      <div className="space-y-6">
        {/* Bloque de Pedidos Activos (Pendientes/Enviados) */}
        <PedidosTable 
            pedidos={pedidosActivos} 
            title="Pedidos Activos (Pendientes o Enviados)" 
            icon={Clock} 
        />

        {/* Bloque de Pedidos Históricos (Completados/Cancelados) */}
        <PedidosTable 
            pedidos={pedidosCompletados} 
            title="Pedidos Completados/Históricos" 
            icon={CheckCircle} 
            isCollapsible={true} 
        />
      </div>
    </div>
  );
}