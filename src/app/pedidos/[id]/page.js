"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
// Importamos CheckCircle
import { ArrowLeft, Edit, Trash2, Download, Truck, FileText, DollarSign, CheckCircle } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para manejar el desglose del total y los cálculos por item.
const PedidoTotalsAndItems = ({ order, margenes, config }) => {
    const ivaRate = config?.iva_rate || 0.21;
    const marginRule = margenes?.find(m => m.id === order.marginId);

    // 1. Calcular el Costo Base Total de todos los ítems.
    const subtotalCostoBase = (order.items || []).reduce((acc, item) => 
        // item.unitPrice en Pedido/Presupuesto contiene el COSTO BASE (materia prima por pieza).
        acc + ((item.quantity || 0) * (item.unitPrice || 0))
    , 0);

    // 2. Obtener la regla de margen y gastos fijos.
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;
    
    // 3. Calcular los totales de Venta (al igual que en el Presupuesto).
    const margenNeto = (subtotalCostoBase * (multiplicador - 1)) || 0;
    const subtotalVentaFinal = subtotalCostoBase + margenNeto + gastoFijoTotal;
    const taxFinal = subtotalVentaFinal * ivaRate;
    const totalFinal = subtotalVentaFinal + taxFinal;

    // --- CÁLCULO DEL PRECIO UNITARIO DE VENTA POR ITEM ---
    const calculatedItems = (order.items || []).map(item => {
        const costoUnitario = item.unitPrice || 0;
        const cantidad = item.quantity || 1;

        // 3a. Calcular la parte del margen sobre el costo unitario
        const margenUnitario = (costoUnitario * (multiplicador - 1));
        
        // 3b. Prorratear el Gasto Fijo total entre TODAS las unidades del pedido
        const totalQuantity = (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
        const gastoFijoUnitarioProrrateado = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;
        
        // 3c. Precio Unitario de Venta
        const precioUnitarioVenta = costoUnitario + margenUnitario + gastoFijoUnitarioProrrateado;

        return {
            ...item,
            // Valores de Coste (Guardados como Precio Unit. en BD)
            costoUnitario: costoUnitario,
            totalCostoItem: costoUnitario * cantidad,
            // Valores de Venta Calculados
            precioUnitarioVenta: precioUnitarioVenta,
            totalVentaItem: precioUnitarioVenta * cantidad,
        };
    });
    // --------------------------------------------------

    return (
        <div className="flex justify-between gap-6">
            {/* Columna de ítems */}
            <div className="flex-1 overflow-x-auto">
                <table className="table w-full">
                    <thead>
                        {/* AÑADIDO: Columnas de Costo (Uso Interno) */}
                        <tr>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>P. Unit. (Costo)</th>
                            <th>Total (Costo)</th>
                            <th className="font-bold text-success">P. Unit. (Venta)</th> 
                            <th className="font-bold text-success text-right">Total (Venta)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculatedItems.map((item, index) => (
                            <tr key={index}>
                                <td className="font-medium">{item.descripcion}</td>
                                <td>{item.quantity}</td>
                                {/* MOSTRANDO COSTO (Sin Margen) */}
                                <td>{item.costoUnitario.toFixed(2)} €</td>
                                <td>{item.totalCostoItem.toFixed(2)} €</td>
                                {/* MOSTRANDO VENTA (Con Margen) */}
                                <td className="font-bold text-success">{item.precioUnitarioVenta.toFixed(2)} €</td>
                                <td className="font-bold text-success text-right">{item.totalVentaItem.toFixed(2)} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Columna de Totales (Desglose) */}
            <div className="w-full max-w-xs space-y-2">
                <div className="divider">Desglose de Costes</div>
                
                <div className="flex justify-between">
                    <span>Subtotal (Costo Base)</span> 
                    <span>{subtotalCostoBase.toFixed(2)} €</span>
                </div>
                
                {multiplicador > 1 && (
                    <div className="flex justify-between text-accent font-medium">
                        <span>Margen (x{multiplicador.toFixed(2)})</span>
                        <span>+ {margenNeto.toFixed(2)} €</span>
                    </div>
                )}
                
                {gastoFijoTotal > 0 && (
                    <div className="flex justify-between text-accent font-medium">
                        <span>Gasto Fijo</span>
                        <span>+ {gastoFijoTotal.toFixed(2)} €</span>
                    </div>
                )}

                <div className="divider my-1"></div>
                
                <div className="flex justify-between font-semibold">
                    <span>Subtotal (Venta)</span> 
                    <span>{subtotalVentaFinal.toFixed(2)} €</span>
                </div>
                
                <div className="flex justify-between">
                    <span>IVA ({((ivaRate || 0.21) * 100).toFixed(0)}%)</span> 
                    <span>{taxFinal.toFixed(2)} €</span>
                </div>
                
                <div className="divider my-1"></div>
                
                <div className="flex justify-between font-bold text-xl text-primary">
                    <span>TOTAL</span> 
                    <span>{totalFinal.toFixed(2)} €</span>
                </div>
            </div>
        </div>
    );
};


export default function PedidoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Cargamos el pedido y la información necesaria para el cálculo
  const { data: order, error: orderError, isLoading: orderLoading } = useSWR(id ? `/api/pedidos/${id}` : null, fetcher);
  const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);
  const { data: config, isLoading: configLoading } = useSWR('/api/config', fetcher);


  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      setIsDeleting(true);
      setError(null);
      try {
        const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar');
        }
        mutate('/api/pedidos'); // Actualiza la lista
        router.push('/pedidos'); // Vuelve a la lista
      } catch (err) {
        setError(err.message);
        setIsDeleting(false);
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/pedidos/${id}/pdf`);
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedido-${order.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };

const handleUpdateStatus = async (newStatus) => {
     try {
        // Obtenemos los totales correctos para la actualización
        const { subtotal, tax, total } = order;
        
        const res = await fetch(`/api/pedidos/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...order, 
                estado: newStatus,
                items: order.items,
                subtotal, tax, total 
            }) 
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al actualizar estado');
        }
        mutate(`/api/pedidos/${id}`); // Recarga este pedido
        mutate('/api/pedidos'); // <--- CRUCIAL: REVALIDA LA LISTA GENERAL DE PEDIDOS
        router.refresh(); // <--- AÑADIDO: Fuerza la re-renderización de las rutas RSC (como /pedidos)
      } catch (err) {
        setError(err.message);
      }
  };

// ... (Resto del componente)
  const isLoading = orderLoading || margenesLoading || configLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (orderError || !order) {
      if (orderError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el pedido.</div>;
  }

  const margenAplicado = margenes?.find(m => m.id === order.marginId);


  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary">
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        {order.presupuestoId && (
            <Link href={`/presupuestos/${order.presupuestoId}`} className="btn btn-outline btn-accent">
                <FileText className="w-4 h-4" /> Ver Presupuesto
            </Link>
        )}
        {/* AÑADIDO: Botón principal de Completado */}
        {order.estado !== 'Completado' && (
            <button onClick={() => handleUpdateStatus('Completado')} className="btn btn-success">
                <CheckCircle className="w-4 h-4" /> Marcar como Completado
            </button>
        )}
        <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
          {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      {/* Detalles del Pedido */}
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Pedido {order.numero}</h1>
            {/* CORRECCIÓN: Comprobación de existencia antes de formatear la fecha */}
            <p className="text-gray-500">Fecha: {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : 'N/A'}</p>
             <div className="dropdown dropdown-hover mt-2">
                <div tabIndex={0} role="button" className={`badge ${order.estado === 'Completado' ? 'badge-success' : (order.estado === 'Enviado' ? 'badge-info' : 'badge-warning')}`}>
                    {order.estado}
                </div>
                <ul tabIndex={0} className="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a onClick={() => handleUpdateStatus('Pendiente')}>Pendiente</a></li>
                    <li><a onClick={() => handleUpdateStatus('Enviado')}>Enviado</a></li>
                    <li><a onClick={() => handleUpdateStatus('Completado')}>Completado</a></li>
                </ul>
            </div>
            {/* Información del Margen Aplicado */}
            {margenAplicado && (
                <div className="flex items-center mt-2 text-sm text-accent">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Margen Aplicado: <span className="font-semibold ml-1">{margenAplicado.descripcion}</span>
                </div>
            )}
          </div>
          <div className="text-right">
            {/* Se mantiene el encadenamiento opcional para evitar TypeError si el cliente es nulo */}
            <h2 className="text-xl font-bold">{order.cliente?.nombre}</h2>
            <p>{order.cliente?.direccion}</p>
            <p>{order.cliente?.email}</p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Items y Totales Reconstruidos */}
        <PedidoTotalsAndItems order={order} margenes={margenes} config={config} />
        
        {order.notes && (
          <div className="mt-6">
            <h3 className="font-bold">Notas:</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}