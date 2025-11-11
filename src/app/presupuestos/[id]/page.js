"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, CheckCircle, Package, DollarSign } from 'lucide-react'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para manejar el cálculo del resumen en la página de detalle
const TotalsSummary = ({ quote, margenes, ivaRate }) => {
    // FIX: Verificar que quote.marginId existe antes de buscar la regla
    const marginRule = margenes?.find(m => m.id === quote.marginId);

    // 1. Calcular subtotal de Costo Base (Necesitamos los ítems para esto)
    const subtotalCostoBase = (quote.items || []).reduce((acc, item) => 
        // unitPrice ahora es el COSTO BASE (según la nueva lógica síncrona del formulario)
        acc + ((item.quantity || 0) * (item.unitPrice || 0))
    , 0);

    // 2. Descomponer el margen y el gasto fijo (si existe y aplica)
    // Usamos 1 y 0 como fallback para evitar NaN
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijo = marginRule?.gastoFijo || 0;
    
    // El subtotal guardado en BD es el 'Subtotal con Margen'
    const subtotalConMargen = quote.subtotal || 0;
    const tax = quote.tax || 0;
    const total = quote.total || 0;

    // Calcular el margen neto (sin el multiplicador base de 1)
    const margenNeto = (subtotalCostoBase * (multiplicador - 1)) || 0;

    return (
        <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between">
                <span>Subtotal (Costo Base)</span> 
                <span>{subtotalCostoBase.toFixed(2)} €</span>
            </div>
            
            {/* Mostrar Margen Aplicado si existe */}
            {multiplicador > 1 && (
                <div className="flex justify-between text-accent font-medium">
                    <span>Margen (x{multiplicador.toFixed(2)})</span>
                    <span>+ {margenNeto.toFixed(2)} €</span>
                </div>
            )}
            
            {gastoFijo > 0 && (
                <div className="flex justify-between text-accent font-medium">
                    <span>Gasto Fijo</span>
                    <span>+ {gastoFijo.toFixed(2)} €</span>
                </div>
            )}

            <div className="divider my-1"></div>
            
            <div className="flex justify-between font-semibold">
                <span>Subtotal (Venta)</span> 
                <span>{subtotalConMargen.toFixed(2)} €</span>
            </div>
            
            <div className="flex justify-between">
                <span>IVA ({((ivaRate || 0.21) * 100).toFixed(0)}%)</span> 
                <span>{tax.toFixed(2)} €</span>
            </div>
            
            <div className="divider my-1"></div>
            
            <div className="flex justify-between font-bold text-xl text-primary">
                <span>TOTAL</span> 
                <span>{total.toFixed(2)} €</span>
            </div>
        </div>
    );
};


export default function PresupuestoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const { data: quote, error: quoteError, isLoading: quoteLoading } = useSWR(id ? `/api/presupuestos/${id}` : null, fetcher);
  // Añadimos carga de Márgenes y Config (IVA)
  const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes', fetcher);
  const { data: config, isLoading: configLoading } = useSWR('/api/config', fetcher);

  const isLoading = quoteLoading || margenesLoading || configLoading;


  const handleDelete = async () => {
    setError("Función de confirmación deshabilitada. Usa modal UI.");
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

  const handleConvertToPedido = async () => {
    setError("Función de confirmación deshabilitada. Usa modal UI.");
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (quoteError || !quote) {
      if (quoteError?.status === 404) return notFound();
      return <div className="text-red-500 text-center">Error al cargar el presupuesto.</div>;
  }
  
  // Obtenemos el precioUnitario (que en la BD es el COSTO) y lo guardamos
  const ivaRate = config?.iva_rate || 0.21;
  const margenAplicado = margenes?.find(m => m.id === quote.marginId);


  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-6">
        {quote.estado === 'Borrador' && (
          <Link href={`/presupuestos/${id}/editar`} className="btn btn-outline btn-primary">
            <Edit className="w-4 h-4" /> Editar
          </Link>
        )}
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary">
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        {quote.estado === 'Borrador' && (
          <button onClick={handleConvertToPedido} className="btn btn-success" disabled={isConverting}>
            {isConverting ? <span className="loading loading-spinner loading-xs"></span> : <CheckCircle className="w-4 h-4" />}
            Convertir a Pedido
          </button>
        )}
        {quote.estado !== 'Aceptado' && (
           <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
            {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        )}
         {quote.estado === 'Aceptado' && quote.pedido?.id && (
          <Link href={`/pedidos/${quote.pedido.id}`} className="btn btn-success btn-outline">
            <Package className="w-4 h-4" /> Ver Pedido Creado
          </Link>
         )}
      </div>

      {/* Detalles del Presupuesto */}
      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Presupuesto {quote.numero}</h1>
            <p className="text-gray-500">Fecha: {new Date(quote.fechaCreacion).toLocaleDateString()}</p>
            <span className={`badge mt-2 ${quote.estado === 'Aceptado' ? 'badge-success' : 'badge-warning'}`}>
              {quote.estado}
            </span>
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

        {/* Items */}
        <div className="overflow-x-auto mt-6">
          <table className="table w-full">
            <thead>
              {/* COMPACTADO: Eliminando saltos de línea para evitar el nodo de texto */}
              <tr><th>Descripción</th><th>Cantidad</th><th>Precio Costo/Unit.</th><th className="font-bold text-right">Total Costo</th></tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                // COMPACTADO: Eliminando saltos de línea y espacios en blanco
                <tr key={index}><td className="font-medium">{item.description}</td><td>{item.quantity}</td><td className="text-right">{item.unitPrice.toFixed(2)} €</td><td className="font-bold text-right">{(item.quantity * item.unitPrice).toFixed(2)} €</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales Reconstruidos */}
        <div className="flex justify-end mt-6">
            <TotalsSummary quote={quote} margenes={margenes} ivaRate={ivaRate} />
        </div>

        {/* Notas */}
        {quote.notes && (
          <div className="mt-6">
            <h3 className="font-bold">Notas:</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}