"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Truck, PlusCircle, CheckSquare, PackageOpen, Edit } from 'lucide-react';
import Link from 'next/link'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ProveedoresPage() {
  const [activeTab, setActiveTab] = useState('NACIONAL');
  const { data: pedidos, error: pedidosError, isLoading } = useSWR('/api/pedidos-proveedores-data', fetcher);

  const handleReceiveOrder = async (pedidoId) => {
     if (confirm('¿Estás seguro de que quieres recibir este pedido? Esto añadirá las bobinas al stock con el coste calculado.')) {
        try {
             const res = await fetch('/api/stock-management/receive-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pedidoId }),
            });
             if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al recibir el pedido');
            }
            mutate('/api/pedidos-proveedores-data'); 
            mutate('/api/almacen-stock');
            mutate('/api/movimientos'); 
        } catch (err) {
            alert(err.message);
        }
     }
  };

  const pedidosFiltrados = pedidos?.filter(p => p.tipo === activeTab) || [];

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (pedidosError) return <div className="text-red-500 text-center">Error al cargar los pedidos a proveedores.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center"><Truck className="mr-2" /> Pedidos a Proveedores</h1>
      
      <div className="flex gap-4 mb-6">
        <Link href="/proveedores/nuevo-nacional" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Pedido Nacional
        </Link>
        <Link href="/proveedores/nuevo-importacion" className="btn btn-accent">
          <PackageOpen className="w-4 h-4" /> Nuevo Contenedor
        </Link>
      </div>

      <div role="tablist" className="tabs tabs-lifted">
        <a role="tab" 
           className={`tab ${activeTab === 'NACIONAL' ? 'tab-active' : ''}`}
           onClick={() => setActiveTab('NACIONAL')}>
           Pedidos Nacionales
        </a>
        <a role="tab" 
           className={`tab ${activeTab === 'IMPORTACION' ? 'tab-active' : ''}`}
           onClick={() => setActiveTab('IMPORTACION')}>
           Contenedores
        </a>
      </div>
      
      <div className="bg-base-100 p-4 rounded-b-lg shadow-xl">
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay pedidos de este tipo.</p>
          )}
          {pedidosFiltrados.map(pedido => (
            <div key={pedido.id} className="card bg-base-200 shadow-md">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title">{pedido.proveedor?.nombre || 'Proveedor N/A'} - {pedido.material}</h2>
                    <p>Fecha: {new Date(pedido.fecha).toLocaleDateString()}</p>
                    <span className={`badge ${pedido.estado === 'Recibido' ? 'badge-success' : 'badge-warning'}`}>{pedido.estado}</span>
                  </div>
                  <div className="flex gap-2">
                    {pedido.estado === 'Pendiente' && (
                      <>
                        <Link href={`/proveedores/${pedido.id}/editar`} className="btn btn-sm btn-info btn-outline">
                          <Edit className="w-4 h-4" /> Editar
                        </Link>
                        <button onClick={() => handleReceiveOrder(pedido.id)} className="btn btn-sm btn-success">
                          <CheckSquare className="w-4 h-4" /> Marcar como Recibido
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
                  <span><strong>Gastos Totales:</strong> {pedido.gastosTotales} {pedido.tipo === 'IMPORTACION' ? '$' : '€'}</span>
                  {pedido.tipo === 'IMPORTACION' && (
                    <span><strong>Tasa Cambio:</strong> {pedido.tasaCambio}</span>
                  )}
                </div>
                {/* --- AÑADIDO: Mostrar Notas --- */}
                {pedido.notas && (
                  <div className="text-sm mt-2 p-2 bg-base-100 rounded">
                    <strong>Notas:</strong> {pedido.notas}
                  </div>
                )}
                
                <div className="overflow-x-auto mt-4">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Medidas (Ancho x Largo)</th>
                        <th>Espesor (mm)</th>
                        <th>Precio/m ({pedido.tipo === 'IMPORTACION' ? '$' : '€'})</th>
                        <th>Coste Final/m (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedido.bobinas.map(bobina => (
                        <tr key={bobina.id}>
                          <td>{bobina.referencia?.nombre || 'N/A'}</td>
                          <td>{bobina.ancho} mm x {bobina.largo} m</td>
                          <td>{bobina.espesor}</td>
                          <td>{bobina.precioMetro.toFixed(2)}</td>
                          <td className="font-bold">{bobina.costoFinalMetro?.toFixed(2) || 'N/A'} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
