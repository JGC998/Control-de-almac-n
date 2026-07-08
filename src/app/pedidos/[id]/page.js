"use client";
import React, { useState } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Download, Printer, FileText, DollarSign, CheckCircle, Package, Plus, Ban, ReceiptText, ClipboardList } from 'lucide-react';
import { toast, toastError } from '@/lib/toast';
import FormularioPedidoCliente from '@/componentes/pedidos/FormularioPedidoCliente';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';


// Componente para manejar el desglose del total y los cálculos por item.
const PedidoTotalsAndItems = ({ order, margenes, config }) => {
  const ivaRate = config?.iva_rate ? parseFloat(config.iva_rate) : 0.21;

  // Obtener regla de margen
  const marginRule = margenes?.find(m => m.id === order.marginId);
  const multiplicador = marginRule?.multiplicador || 1;
  const gastoFijoTotal = marginRule?.gastoFijo || 0;

  const items = order.items || [];
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const gastoFijoUnitario = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;

  // Totales calculados para visualización (Similar a Presupuestos)
  const subtotalCostoBase = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

  // Si tenemos totales guardados en el pedido, intentamos usarlos para el resumen final, 
  // pero calculamos el desglose para la tabla.
  const subtotalVentaCalculado = (subtotalCostoBase * multiplicador) + gastoFijoTotal;
  const taxCalculado = subtotalVentaCalculado * ivaRate;
  const totalCalculado = subtotalVentaCalculado + taxCalculado;

  // Preferimos los valores guardados si existen, sino los calculados
  const subtotalDisplay = order.subtotal || subtotalVentaCalculado;
  const taxDisplay = order.tax || taxCalculado;
  const totalDisplay = order.total || totalCalculado;

  // Para identificar discrepancias visuales si las reglas cambiaron
  const isHistoricalAccurate = Math.abs(totalDisplay - totalCalculado) < 0.1;

  return (
    <div className="flex flex-col md:flex-row justify-between gap-6">
      {/* Columna de ítems */}
      <div className="flex-1 overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="text-center">Cantidad</th>
              <th className="text-right">P. Unit. (Costo)</th>
              <th className="text-right">Total (Costo)</th>
              <th className="font-bold text-success text-right">P. Unit. (Venta)</th>
              <th className="font-bold text-success text-right">Total (Venta)</th>
              <th className="text-right opacity-70">Peso Unit.</th>
              <th className="text-right opacity-70">Peso Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              // Costo Base
              const costoUnitario = item.unitPrice;
              const totalCosto = item.quantity * costoUnitario;

              // Venta Calculada
              const margenItem = costoUnitario * (multiplicador - 1);
              const precioVentaUnitario = costoUnitario + margenItem + gastoFijoUnitario;
              const totalVenta = item.quantity * precioVentaUnitario;

              // Peso
              const pesoUnit = item.pesoUnitario || 0;
              const pesoTotal = pesoUnit * item.quantity;

              // Intentamos recuperar info del producto si está disponible
              const nombreProducto = item.producto ? item.producto.nombre : null;

              return (
                <tr key={index}>
                  <td className="font-medium min-w-[200px]">
                    {item.descripcion}
                    {nombreProducto && <div className="text-xs opacity-50 flex items-center gap-1"><Package className="w-3 h-3" /> {nombreProducto}</div>}
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right opacity-70">{costoUnitario.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="text-right opacity-70">{totalCosto.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="font-bold text-success text-right">{precioVentaUnitario.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="font-bold text-success text-right">{totalVenta.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</td>
                  <td className="text-right opacity-70 text-sm">{pesoUnit > 0 ? `${pesoUnit.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg` : '—'}</td>
                  <td className="text-right opacity-70 text-sm">{pesoTotal > 0 ? `${pesoTotal.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kg` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Columna de Totales */}
      <div className="w-full md:max-w-xs space-y-4 bg-base-200 p-6 rounded-lg h-fit">
        <h3 className="font-bold text-lg">Resumen Económico</h3>

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{subtotalDisplay.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        {multiplicador > 1 && (
          <div className="text-xs text-right text-gray-500">
            (Incluye Margen x{multiplicador})
          </div>
        )}

        <div className="flex justify-between">
          <span>Impuestos ({(ivaRate * 100).toLocaleString('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0})}%)</span>
          <span>{taxDisplay.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        <div className="divider my-1"></div>

        <div className="flex justify-between font-bold text-2xl text-primary">
          <span>TOTAL</span>
          <span>{totalDisplay.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
        </div>

        {!isHistoricalAccurate && (
          <div className="alert alert-warning text-xs mt-2 py-2">
            <span>Nota: Las reglas de margen actuales difieren de las guardadas. Se muestran los totales históricos.</span>
          </div>
        )}
      </div>
    </div>
  );
};


export default function PedidoDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const { data: order, error: orderError, isLoading: orderLoading, mutate } = useSWR(id ? `/api/pedidos/${id}` : null);
  const { data: margenes } = useSWR('/api/pricing/margenes');
  const { data: config } = useSWR('/api/config');
  const handleDelete = async () => {
    const ok = await confirmar({ titulo: '¿Eliminar pedido?', mensaje: 'Esta acción no se puede deshacer.' });
    if (!ok) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al eliminar');
      }
      globalMutate('/api/pedidos');
      router.push('/pedidos');
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPDF = () => {
    window.open(`/api/pedidos/${id}/pdf?inline=true`, '_blank');
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al actualizar estado');
      }
      mutate(`/api/pedidos/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleSinFacturacion = async () => {
    const nuevoValor = !order.sinFacturacion;
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinFacturacion: nuevoValor }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      mutate(`/api/pedidos/${id}`);
      toast(nuevoValor ? 'Pedido marcado como sin facturación' : 'Pedido marcado para facturación normal', nuevoValor ? 'info' : 'success');
    } catch (err) {
      setError(err.message);
    }
  };

  const isLoading = orderLoading;

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (orderError || !order) {
    if (orderError?.status === 404) return notFound();
    return <div className="text-error text-center">Error al cargar el pedido.</div>;
  }

  const margenAplicado = margenes?.find(m => m.id === order.marginId);

  return (
    <div className="container mx-auto p-4">
      <ModalConfirmacion />
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {error && <div className="alert alert-error shadow-lg mb-4">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => window.open(`/api/pedidos/${id}/pdf-taller`, '_blank')}
          className="btn btn-outline gap-1"
        >
          <ClipboardList className="w-4 h-4" /> Nota Taller
        </button>
        <button
          onClick={() => window.open(`/api/pedidos/${id}/pdf-taller?valorado=1`, '_blank')}
          className="btn btn-success gap-1"
        >
          <ClipboardList className="w-4 h-4" /> Nota Taller Valorada
        </button>
        {/*
          OCULTO — Botón Nota de trabajo
          Genera un PDF interno con dimensiones técnicas (columnas: Descripción, Detalles, Cantidad, Peso).
          La ruta destino es /pedidos/[id]/nota-trabajo y el PDF lo produce generateNotaTrabajoPDF en pdfGenerator.js.
          Descomentar cuando se quiera activar el flujo de producción interna.

          <Link href={`/pedidos/${id}/nota-trabajo`} className="btn btn-outline btn-warning gap-1">
            <ClipboardList className="w-4 h-4" /> Nota de trabajo
          </Link>
        */}
        <button onClick={openEditModal} className="btn btn-outline btn-primary">
          <Edit className="w-4 h-4" /> Editar Pedido
        </button>
        {order.presupuestoId && (
          <Link href={`/presupuestos/${order.presupuestoId}`} className="btn btn-outline btn-accent">
            <FileText className="w-4 h-4" /> Ver Presupuesto
          </Link>
        )}
        {order.estado === 'Pendiente' && !order.sinFacturacion && (
          <button onClick={() => handleUpdateStatus('Facturado')} className="btn btn-success">
            <CheckCircle className="w-4 h-4" /> Marcar como Facturado
          </button>
        )}
        {/*
          OCULTO — Botón Sin facturación / Facturar normalmente
          Alterna order.sinFacturacion (true/false) vía handleToggleSinFacturacion → PUT /api/pedidos/[id].
          Cuando sinFacturacion=true el pedido no genera albarán ni factura y no entra en la secuencia AEAT.
          Está relacionado con el tab "Internos / No facturables" de la lista de pedidos.
          Descomentar junto con los tabs de Facturables cuando se active la separación de pedidos internos.

          <button
            onClick={handleToggleSinFacturacion}
            className={`btn btn-sm gap-1 ${order.sinFacturacion ? 'btn-success btn-outline' : 'btn-ghost text-base-content/50 border border-base-300'}`}
            title={order.sinFacturacion ? 'Quitar marca: se podrá generar albarán y factura' : 'Marcar como pedido interno / no facturable'}
          >
            {order.sinFacturacion
              ? <><ReceiptText className="w-4 h-4" /> Facturar normalmente</>
              : <><Ban className="w-4 h-4" /> Sin facturación</>
            }
          </button>
        */}
        <button onClick={handleDelete} className="btn btn-outline btn-error" disabled={isDeleting}>
          {isDeleting ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 className="w-4 h-4" />}
          Eliminar
        </button>
      </div>

      <div className="bg-base-100 shadow-xl rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Pedido {order.numero}</h1>
            <p className="text-base-content/60">Fecha: {order.fechaCreacion ? new Date(order.fechaCreacion).toLocaleDateString() : 'N/A'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {order.sinFacturacion && (
                <span className="badge badge-error badge-outline gap-1 text-xs">
                  <Ban className="w-3 h-3" /> Sin facturación
                </span>
              )}
            <div className="dropdown dropdown-hover">
              <div tabIndex={0} role="button" className={`badge ${order.estado === 'Facturado' ? 'badge-success' : order.estado === 'Cancelado' ? 'badge-error' : 'badge-warning'}`}>
                {order.estado}
              </div>
              <ul tabIndex={0} className="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><button onClick={() => handleUpdateStatus('Pendiente')}>Pendiente</button></li>
                {!order.sinFacturacion && <li><button onClick={() => handleUpdateStatus('Facturado')}>Facturado</button></li>}
                <li><button onClick={() => handleUpdateStatus('Cancelado')}>Cancelado</button></li>
              </ul>
            </div>
            </div>
            {margenAplicado && (
              <div className="flex items-center mt-2 text-sm text-accent">
                <DollarSign className="w-4 h-4 mr-1" />
                Margen Aplicado: <span className="font-semibold ml-1">{margenAplicado.descripcion}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{order.cliente?.nombre}</h2>
            <p>{order.cliente?.direccion}</p>
            <p>{order.cliente?.email}</p>
          </div>
        </div>

        <div className="divider"></div>

        <PedidoTotalsAndItems order={order} margenes={margenes} config={config} />

        <div className="divider"></div>

        <div className="mt-6 bg-base-200 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-2">Notas del Pedido</h3>
          <p className="text-base-content whitespace-pre-wrap">
            {order.notas || 'Sin notas registradas.'}
          </p>
        </div>

      </div>

      {/* Modal de Edición del Pedido */}
      <dialog id="edit_pedido_modal" className={`modal ${isEditModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-7xl">
          <button onClick={closeEditModal} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" >✕</button>
          <h3 className="font-bold text-lg mb-4">Editar Pedido {order.numero}</h3>

          <FormularioPedidoCliente
            initialData={order}
            onSuccess={() => { mutate(`/api/pedidos/${id}`); closeEditModal(); }}
            onCancel={closeEditModal}
            formType="PEDIDO"
          />
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={closeEditModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}
