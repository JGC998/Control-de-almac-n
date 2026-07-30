"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, DollarSign, FileText } from 'lucide-react';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';



// Componente para manejar el desglose del total y los cálculos por item.
const PresupuestoTotalsAndItems = ({ quote, margenes, config }) => {
  const rawIvaRate = config?.iva_rate || 0.21;
  const ivaRate = rawIvaRate > 1 ? rawIvaRate / 100 : rawIvaRate;
  const marginRule = margenes?.find(m => m.id === quote.marginId);

  // 1. Calcular el Costo Base Total de todos los ítems.
  // item.unitPrice en Presupuesto contiene el COSTO BASE (precio del producto).
  const subtotalCostoBase = (quote.items || []).reduce((acc, item) =>
    acc + ((item.quantity || 0) * (item.unitPrice || 0))
    , 0);

  // 2. Obtener la regla de margen y gastos fijos.
  const multiplicador = marginRule?.multiplicador || 1;
  const gastoFijoTotal = marginRule?.gastoFijo || 0;

  // 3. Calcular los totales de Venta
  const margenNeto = (subtotalCostoBase * (multiplicador - 1)) || 0;
  const subtotalVentaFinal = subtotalCostoBase + margenNeto + gastoFijoTotal;
  const taxFinal = subtotalVentaFinal * ivaRate;
  const totalFinal = subtotalVentaFinal + taxFinal;

  // --- CÁLCULO DEL PRECIO UNITARIO DE VENTA POR ITEM ---
  const calculatedItems = (quote.items || []).map(item => {
    const costoUnitario = item.unitPrice || 0;
    const cantidad = item.quantity || 1;

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
    };
  });
  // --------------------------------------------------

  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      {/* Columna de ítems */}
      <div className="flex-1 overflow-x-auto">
        <table className="table w-full">
          <thead>
            {/* AÑADIDO: Columnas de Costo (Uso Interno) */}
            <tr>
              <th>Descripción</th>
              <th className="text-center">Cantidad</th>
              <th className="text-right">P. Unit. (Costo)</th>
              <th className="text-right">Total (Costo)</th>
              <th className="font-bold text-success text-right">P. Unit. (Venta)</th>
              <th className="font-bold text-success text-right">Total (Venta)</th>
            </tr>
          </thead>
          <tbody>
            {calculatedItems.map((item, index) => (
              <tr key={index}>
                <td className="font-medium">
                  {item.descripcion}
                  {item.producto && <div className="text-xs opacity-50">{item.producto.nombre}</div>}
                </td>
                <td className="text-center">{item.quantity}</td>
                {/* MOSTRANDO COSTO (Sin Margen) */}
                <td className="text-right">{item.costoUnitario.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                <td className="text-right">{item.totalCostoItem.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                {/* MOSTRANDO VENTA (Con Margen) */}
                <td className="font-bold text-success text-right">{item.precioUnitarioVenta.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                <td className="font-bold text-success text-right">{item.totalVentaItem.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Columna de Totales (Desglose) */}
      <div className="w-full md:max-w-xs space-y-2 bg-base-200 p-4 rounded-lg h-fit">
        <div className="font-bold text-lg mb-2">Desglose de Costes</div>

        <div className="flex justify-between">
          <span>Subtotal (Costo Base)</span>
          <span>{subtotalCostoBase.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        {multiplicador > 1 && (
          <div className="flex justify-between text-accent font-medium">
            <span>Margen (x{multiplicador.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
            <span>+ {margenNeto.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
          </div>
        )}

        {gastoFijoTotal > 0 && (
          <div className="flex justify-between text-accent font-medium">
            <span>Gasto Fijo</span>
            <span>+ {gastoFijoTotal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
          </div>
        )}

        <div className="divider my-1"></div>

        <div className="flex justify-between font-semibold">
          <span>Subtotal (Venta)</span>
          <span>{subtotalVentaFinal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        <div className="flex justify-between">
          <span>IVA ({((ivaRate || 0.21) * 100).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%)</span>
          <span>{taxFinal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        <div className="divider my-1"></div>

        <div className="flex justify-between font-bold text-xl text-primary">
          <span>TOTAL</span>
          <span>{totalFinal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
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
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  // Cargamos el presupuesto y la información necesaria para el cálculo
  const { data: quote, error: quoteError, isLoading: quoteLoading } = useSWR(id ? `/api/presupuestos/${id}` : null);
  const { data: margenes, isLoading: margenesLoading } = useSWR('/api/pricing/margenes');
  const { data: config, isLoading: configLoading } = useSWR('/api/config');


  const handleDelete = async () => {
    const ok = await confirmar({ titulo: '¿Eliminar presupuesto?', mensaje: 'Esta acción no se puede deshacer.' });
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/presupuestos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al eliminar');
      }
      mutate('/api/presupuestos');
      router.push('/presupuestos');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
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
      mutate('/api/pedidos');
      mutate(`/api/presupuestos/${id}`);
      router.push(`/pedidos/${newOrder.id}`);

    } catch (err) {
      setError(err.message);
      setIsCreatingOrder(false);
    }
  };


  const isLoading = quoteLoading || margenesLoading || configLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (quoteError || !quote) {
    if (quoteError?.status === 404) return notFound();
    return <div className="text-error text-center">Error al cargar el presupuesto.</div>;
  }

  const badgeEstado = {
    Pendiente: 'badge-warning',
    Aceptado: 'badge-success',
    Rechazado: 'badge-error',
    Enviado: 'badge-info',
  }[quote.estado] ?? 'badge-neutral';

  const margenAplicado = margenes?.find(m => m.id === quote.marginId);


  return (
    <div className="container mx-auto p-4">
      <ModalConfirmacion />
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={handleDownloadPDF} className="btn btn-outline btn-secondary" disabled={isDownloading}>
          {isDownloading ? <span className="loading loading-spinner loading-xs" /> : <Download className="w-4 h-4" />}
          Descargar PDF
        </button>
        <button onClick={handleCreateOrder} className="btn btn-primary" disabled={isCreatingOrder}>
          {isCreatingOrder ? <span className="loading loading-spinner loading-xs" /> : <FileText className="w-4 h-4" />}
          Crear Pedido
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
            <p className="text-base-content/60">Fecha: {quote.fechaCreacion ? new Date(quote.fechaCreacion).toLocaleDateString() : 'N/A'}</p>
            <span className={`badge ${badgeEstado} mt-2`}>{quote.estado}</span>
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
