"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, DollarSign, FileText } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para manejar el desglose del total y los cálculos por item.
const PresupuestoTotalsAndItems = ({ quote, margenes, config }) => {
    const ivaRate = config?.iva_rate || 0.21;
    const marginRule = margenes?.find(m => m.id === quote.marginId);

    // 1. Calcular el Costo Base Total de todos los ítems.
    // item.unitPrice en Presupuesto contiene el COSTO BASE (materia prima por pieza).
    const subtotalCostoBase = (quote.items || []).reduce((acc, item) => 
        acc + ((item.quantity || 0) * (item.unitPrice || 0))
    , 0);

    // 2. Obtener la regla de margen y gastos fijos.
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;
    
    // 3. Calcular los totales de Venta (Re-cálculo para consistencia)
    const margenNeto = (subtotalCostoBase * (multiplicador - 1)) || 0;
    const subtotalVentaFinal = subtotalCostoBase + margenNeto + gastoFijoTotal;
    const taxFinal = subtotalVentaFinal * ivaRate;
    const totalFinal = subtotalVentaFinal + taxFinal;
    const pesoTotalDelPedido = (quote.items || []).reduce((acc, item) => 
        acc + ((item.quantity || 0) * (item.pesoUnitario || 0))
    , 0);

    // --- CÁLCULO DEL PRECIO UNITARIO DE VENTA POR ITEM ---
    const calculatedItems = (quote.items || []).map(item => {
        const costoUnitario = item.unitPrice || 0;
        const cantidad = item.quantity || 1;
        const pesoUnitario = item.pesoUnitario || 0;

        // 3a. Calcular la parte del margen sobre el costo unitario
        const margenUnitario = (costoUnitario * (multiplicador - 1));
        
        // 3b. Prorratear el Gasto Fijo total entre TODAS las unidades del pedido
        const totalQuantity = (quote.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
        const gastoFijoUnitarioProrrateado = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;
        
        // 3c. Precio Unitario de Venta
        const precioUnitarioVenta = costoUnitario + margenUnitario + gastoFijoUnitarioProrrateado;

        return {
            ...item,
            // Valores de Coste (Uso Interno)
            costoUnitario: costoUnitario,
            totalCostoItem: costoUnitario * cantidad,
            // Valores de Venta Calculados
            precioUnitarioVenta: precioUnitarioVenta,
            totalVentaItem: precioUnitarioVenta * cantidad,
            // Pesos
            pesoUnitario: pesoUnitario,
            pesoTotalItem: pesoUnitario * cantidad,
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
                            <th>Peso U.</th>
                            <th>Peso Total</th>
                            <th>P. Unit. (Costo)</th>
                            <th>Total (Costo)</th>
                            <th className="font-bold text-success">P. Unit. (Venta)</th> 
                            <th className="font-bold text-success text-right">Total (Venta)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calculatedItems.map((item, index) => (
                            <tr key={index}>
                                <td className="font-medium">{item.description}</td>
                                <td>{item.quantity}</td>
                                <td>{item.pesoUnitario.toFixed(2)} kg</td>
                                <td>{item.pesoTotalItem.toFixed(2)} kg</td>
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

                <div className="divider"></div>

                <div className="flex justify-between font-bold text-l">
                    <span>Peso Total del Pedido</span> 
                    <span>{pesoTotalDelPedido.toFixed(2)} kg</span>
                </div>
            </div>
        </div>
    );
};


export default function PresupuestoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Cargamos el presupuesto y la información necesaria para el cálculo
  const { data: quote, error: quoteError, isLoading: quoteLoading } = useSWR(id ? `/api/presupuestos/${id}` : null, fetcher);
  const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);
  const { data: config, isLoading: configLoading } = useSWR('/api/config', fetcher);


  const handleDelete = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar este presupuesto?')) {
      setIsDeleting(true);
      setError(null);
      try {
        const res = await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Error al eliminar');
        }
        mutate('/api/presupuestos'); // Actualiza la lista
        router.push('/presupuestos'); // Vuelve a la lista
      } catch (err) {
        setError(err.message);
        setIsDeleting(false);
      }
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/presupuestos/${id}/pdf`);
      if (!res.ok) throw new Error('Error al generar el PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presupuesto-${quote.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleCreateOrder = async () => {
    try {
        const res = await fetch('/api/pedidos/from-presupuesto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ presupuestoId: id })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Error al crear el pedido');
        }

        const newOrder = await res.json();
        // Opcional: Actualizar el estado del presupuesto si cambia al crear el pedido
        mutate(`/api/presupuestos/${id}`);
        mutate('/api/pedidos');
        router.push(`/pedidos/${newOrder.id}`);

    } catch (err) {
        setError(err.message);
    }
  };


  const isLoading = quoteLoading || margenesLoading || configLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (quoteError || !quote) {
      if (quoteError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el presupuesto.</div>;
  }
  
  const margenAplicado = margenes?.find(m => m.id === quote.marginId);


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
        <button onClick={handleCreateOrder} className="btn btn-primary">
          <FileText className="w-4 h-4" /> Crear Pedido
        </button>
        <Link href={`/presupuestos/${id}/editar`} className="btn btn-outline">
          <Edit className="w-4 h-4" /> Editar
        </Link>
        <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
          {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      {/* Detalles del Presupuesto */}
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Presupuesto {quote.numero}</h1>
            <p className="text-gray-500">Fecha: {quote.fechaCreacion ? new Date(quote.fechaCreacion).toLocaleDateString() : 'N/A'}</p>
            <span className="badge badge-info mt-2">{quote.estado}</span>
            {/* Información del Margen Aplicado */}
            {margenAplicado && (
                <div className="flex items-center mt-2 text-sm text-accent">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Margen Aplicado: <span className="font-semibold ml-1">{margenAplicado.descripcion}</span>
                </div>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{quote.cliente?.nombre}</h2>
            <p>{quote.cliente?.direccion}</p>
            <p>{quote.cliente?.email}</p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Items y Totales Reconstruidos */}
        <PresupuestoTotalsAndItems quote={quote} margenes={margenes} config={config} />
        
        <div className="divider"></div>

        {/* Bloque de Notas */}
        <div className="mt-6 bg-base-200 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">Notas del Presupuesto</h3>
            <p className="text-base-content whitespace-pre-wrap">
                {quote.notas || 'Sin notas registradas.'}
            </p>
        </div>

      </div>
    </div>
  );
}