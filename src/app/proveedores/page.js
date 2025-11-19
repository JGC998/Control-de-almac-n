"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Truck, PlusCircle, CheckSquare, PackageOpen, Edit, Anchor, Eye, Trash2, Clock, Archive } from 'lucide-react';
import Link from 'next/link'; 
import PedidoProveedorDetalleModal from '@/components/PedidoProveedorDetalleModal'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Mapa de URLs de seguimiento
const trackingUrls = {
  "Yang Ming": "https://www.yangming.com/en/esolution/cargo_tracking?service=",
  "MSC": "https://www.msc.com/en/track-a-shipment?trackingNumber=",
  "Maersk": "https://www.maersk.com/tracking/",
  "CMA CGM": "https://www.cma-cgm.com/ebusiness/tracking/search?searchBy=Container&searchValue=",
};

const getTrackingUrl = (naviera, contenedor) => {
  if (!naviera || !contenedor) return null;
  const baseUrl = trackingUrls[naviera];
  return baseUrl ? `${baseUrl}${contenedor}` : null;
};

// Componente interno para renderizar la tarjeta del pedido (para no duplicar código en los acordeones)
const PedidoCard = ({ pedido, onReceive, onDelete, onViewDetails }) => {
    const trackingUrl = getTrackingUrl(pedido.naviera, pedido.numeroContenedor);
    const isRecibido = pedido.estado === 'Recibido';

    return (
        <div className="card bg-base-200 shadow-md mb-4">
            <div className="card-body p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="card-title text-lg">
                            {pedido.proveedor?.nombre || 'Proveedor N/A'} - <span className="text-base font-normal">{pedido.material}</span>
                        </h2>
                        <div className="text-sm mt-1 space-y-1">
                            <p>Fecha Pedido: <span className="font-mono">{new Date(pedido.fecha).toLocaleDateString()}</span></p>
                            {pedido.fechaLlegadaEstimada && (
                                <p className={!isRecibido ? "font-bold text-primary" : ""}>
                                    ETA: {new Date(pedido.fechaLlegadaEstimada).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <span className={`badge ${isRecibido ? 'badge-success' : 'badge-warning'}`}>{pedido.estado}</span>
                            {pedido.numeroContenedor && (
                                <span className="badge badge-outline">{pedido.numeroContenedor} ({pedido.naviera})</span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button onClick={() => onViewDetails(pedido)} className="btn btn-sm btn-info btn-outline">
                            <Eye className="w-4 h-4" /> Ver
                        </button>
                        
                        {trackingUrl && pedido.tipo === 'IMPORTACION' && !isRecibido && (
                            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary btn-outline">
                                <Anchor className="w-4 h-4" /> Rastrear
                            </a>
                        )}
                        
                        {!isRecibido && (
                            <>
                                <Link href={`/proveedores/${pedido.id}/editar`} className="btn btn-sm btn-info btn-outline">
                                    <Edit className="w-4 h-4" /> Editar
                                </Link>
                                <button onClick={() => onReceive(pedido.id)} className="btn btn-sm btn-success text-white">
                                    <CheckSquare className="w-4 h-4" /> Recibir
                                </button>
                            </>
                        )}
                        
                        <button onClick={() => onDelete(pedido.id)} className="btn btn-sm btn-error btn-outline">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-3 opacity-70 border-t border-base-content/10 pt-3">
                    <span><strong>Gastos:</strong> {pedido.gastosTotales} {pedido.tipo === 'IMPORTACION' ? '$' : '€'}</span>
                    {pedido.tipo === 'IMPORTACION' && (
                        <span><strong>Tasa:</strong> {pedido.tasaCambio}</span>
                    )}
                    <span className="col-span-2 truncate">{pedido.notas && `Nota: ${pedido.notas}`}</span>
                </div>
                
                {/* Tabla resumen desplegable o simple si se prefiere */}
                <div className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box mt-3">
                    <input type="checkbox" /> 
                    <div className="collapse-title text-sm font-medium min-h-8 py-2">
                        Ver Bobinas ({pedido.bobinas.length})
                    </div>
                    <div className="collapse-content"> 
                        <div className="overflow-x-auto">
                            <table className="table table-xs w-full">
                                <thead>
                                    <tr>
                                        <th>Ref</th>
                                        <th>Medidas</th>
                                        <th>Precio</th>
                                        <th>Coste Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedido.bobinas.map(bobina => (
                                        <tr key={bobina.id}>
                                            <td>{bobina.referencia?.nombre || 'N/A'}</td> 
                                            <td>{bobina.ancho}x{bobina.largo}</td>
                                            <td>{bobina.precioMetro.toFixed(2)}</td>
                                            <td className="font-bold">{bobina.costoFinalMetro?.toFixed(2) || '-'} €</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function ProveedoresPage() {
  const [activeTab, setActiveTab] = useState('NACIONAL');
  const [detallePedido, setDetallePedido] = useState(null); 
  
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

  const handleDeletePedido = async (pedidoId) => {
    if (!confirm('¿Estás seguro de que quieres ELIMINAR este pedido? Si el pedido está "Recibido", debe primero revertir el stock manualmente.')) {
        return;
    }
    try {
        const res = await fetch(`/api/pedidos-proveedores-data/${pedidoId}`, { method: 'DELETE' });
        if (!res.ok) {
             const errData = await res.json();
             throw new Error(errData.message || 'Error al eliminar el pedido.');
        }
        mutate('/api/pedidos-proveedores-data');
    } catch (err) {
        alert(err.message);
    }
  };

  // Filtramos primero por TAB (Nacional/Importacion)
  const pedidosDelTab = pedidos?.filter(p => p.tipo === activeTab) || [];

  // Dentro del Tab, separamos en Pendientes y Recibidos
  const pendientes = pedidosDelTab.filter(p => p.estado !== 'Recibido');
  const recibidos = pedidosDelTab.filter(p => p.estado === 'Recibido');

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

      {/* TABS DE NAVEGACIÓN */}
      <div role="tablist" className="tabs tabs-lifted mb-0">
        <a role="tab" 
           className={`tab ${activeTab === 'NACIONAL' ? 'tab-active font-bold' : ''}`}
           onClick={() => setActiveTab('NACIONAL')}>
           Pedidos Nacionales
        </a>
        <a role="tab" 
           className={`tab ${activeTab === 'IMPORTACION' ? 'tab-active font-bold' : ''}`}
           onClick={() => setActiveTab('IMPORTACION')}>
           Contenedores Importación
        </a>
      </div>
      
      <div className="bg-base-100 p-4 rounded-b-lg shadow-xl border-t border-base-300">
        
        {/* ACORDEÓN 1: PENDIENTES (Abierto por defecto) */}
        <div className="collapse collapse-arrow border border-base-200 bg-base-100 mb-4">
            <input type="checkbox" defaultChecked /> 
            <div className="collapse-title text-xl font-medium flex items-center gap-2 text-warning">
                <Clock className="w-5 h-5" /> Pendientes ({pendientes.length})
            </div>
            <div className="collapse-content"> 
                <div className="pt-4">
                    {pendientes.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 italic">No hay pedidos pendientes en esta sección.</p>
                    ) : (
                        pendientes.map(pedido => (
                            <PedidoCard 
                                key={pedido.id} 
                                pedido={pedido} 
                                onReceive={handleReceiveOrder} 
                                onDelete={handleDeletePedido}
                                onViewDetails={setDetallePedido}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* ACORDEÓN 2: RECIBIDOS (Cerrado por defecto para limpieza visual) */}
        <div className="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" /> 
            <div className="collapse-title text-xl font-medium flex items-center gap-2 text-success">
                <Archive className="w-5 h-5" /> Recibidos ({recibidos.length})
            </div>
            <div className="collapse-content"> 
                 <div className="pt-4">
                    {recibidos.length === 0 ? (
                        <p className="text-center text-gray-400 py-4 italic">No hay pedidos recibidos en esta sección.</p>
                    ) : (
                        recibidos.map(pedido => (
                            <PedidoCard 
                                key={pedido.id} 
                                pedido={pedido} 
                                onReceive={handleReceiveOrder} 
                                onDelete={handleDeletePedido}
                                onViewDetails={setDetallePedido}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
      
      {/* Modal de Detalle */}
      {detallePedido && (
        <PedidoProveedorDetalleModal 
          pedido={detallePedido} 
          onClose={() => setDetallePedido(null)} 
        />
      )}
    </div>
  );
}