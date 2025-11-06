"use client";
import React, { useMemo } from 'react';
import { Truck, PackageOpen, CheckSquare, Anchor, X, DollarSign, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

// Componente principal del modal de solo lectura
export default function PedidoProveedorDetalleModal({ pedido, onClose }) {
  if (!pedido) return null;
  
  const isImportacion = pedido.tipo === 'IMPORTACION';
  const trackingUrl = getTrackingUrl(pedido.naviera, pedido.numeroContenedor);
  
  // --- Lógica para calcular y formatear Costes (Aplicando Tasa de Cambio para Importación) ---
  const { 
    divisaOriginal, 
    gastosMostrados, 
    costeTotalMostrado,
    costeBobinasOriginal, 
    gastosOriginal 
  } = useMemo(() => {
    const tasaCambio = pedido.tasaCambio || 1;
    const gastosOrig = pedido.gastosTotales || 0;
    
    const costeBobinasOrig = (pedido.bobinas || []).reduce((acc, bobina) => {
      return acc + (bobina.largo * bobina.precioMetro);
    }, 0);

    const costeTotalOrig = costeBobinasOrig + gastosOrig;
    
    if (isImportacion) {
        const gastosEuros = gastosOrig * tasaCambio;
        const costeTotalEuros = costeTotalOrig * tasaCambio;
        
        return {
            divisaOriginal: 'USD',
            gastosMostrados: gastosEuros,
            costeTotalMostrado: costeTotalEuros,
            costeBobinasOriginal: costeBobinasOrig,
            gastosOriginal: gastosOrig
        };
    } else {
        return {
            divisaOriginal: 'EUR',
            gastosMostrados: gastosOrig,
            costeTotalMostrado: costeTotalOrig,
            costeBobinasOriginal: costeBobinasOrig,
            gastosOriginal: gastosOrig
        };
    }
  }, [pedido.bobinas, pedido.gastosTotales, pedido.tasaCambio, isImportacion]);
  // ------------------------------------------------------------------------------------------

  const CurrencyIcon = isImportacion ? DollarSign : Euro;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-4xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold flex items-center">
            {isImportacion ? <PackageOpen className="mr-2" /> : <Truck className="mr-2" />}
            Detalles del Pedido {pedido.estado}
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* INFORMACIÓN PRINCIPAL */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-base-200 rounded-lg shadow-inner">
            <div className="col-span-1">
              <p className="text-lg font-semibold text-primary">{pedido.proveedor?.nombre || 'Proveedor N/A'}</p>
              <p className="text-sm text-gray-400">Material: {pedido.material}</p>
              <span className={`badge mt-1 ${pedido.estado === 'Recibido' ? 'badge-success' : 'badge-warning'}`}>{pedido.estado}</span>
            </div>
            <div className="col-span-1 text-center">
               {isImportacion && (
                <>
                  <p className="text-sm text-gray-400">Tasa de Cambio (USD a EUR)</p>
                  <p className="text-xl font-bold">{pedido.tasaCambio}</p>
                </>
              )}
            </div>
            <div className="col-span-1 text-right">
              <p>Fecha Pedido: {format(new Date(pedido.fecha), 'P', { locale: es })}</p>
            </div>
          </div>

          
          {/* SECCIÓN DE COSTE TOTAL CON MEJORAS ESTÉTICAS */}
          <div className="bg-base-100 p-4 rounded-lg border border-base-300 shadow-lg">
              <h4 className="font-bold mb-4 text-xl flex items-center">
                <Euro className="w-5 h-5 mr-1" /> Resumen de Costes
              </h4>
              
              <div className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm">
                  {/* SECCIÓN ORIGINAL (Divisa de Proveedor) */}
                  <div className="col-span-3 font-bold text-gray-500 mb-2 border-b border-base-300">
                      Costes en {divisaOriginal}
                  </div>
                  
                  <p className="font-semibold">Coste Bobinas:</p>
                  <p className="col-span-2 text-right text-gray-400">{costeBobinasOriginal.toFixed(2)} {divisaOriginal}</p>
                  
                  <p className="font-semibold">Gastos Totales:</p>
                  <p className="col-span-2 text-right text-gray-400">{gastosOriginal.toFixed(2)} {divisaOriginal}</p>
                  
                  {/* SECCIÓN CONVERTIDA (Solo para Importación) */}
                  {isImportacion && (
                      <>
                          <div className="col-span-3 font-bold text-success mt-4 mb-2 border-b border-base-300">
                             Costes Convertidos a EUR (€)
                          </div>
                          
                          <p className="font-semibold text-lg">Gastos Totales (EUR):</p>
                          <p className="col-span-2 text-right font-semibold text-lg">{gastosMostrados.toFixed(2)} €</p>
                      </>
                  )}
                  
                  <hr className="col-span-3 border-primary/50 my-2" /> 
                  
                  {/* Coste Total del Pedido (EUR) */}
                  <p className="font-bold text-xl text-primary">Coste Total del Pedido:</p>
                  <p className="col-span-2 text-right font-bold text-xl text-primary">{costeTotalMostrado.toFixed(2)} €</p>
              </div>
          </div>
          
          {/* Detalles de Envío */}
          {isImportacion && (
            <div className="bg-base-200 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Detalles de Envío</h4>
              <p>Contenedor: <span className="font-semibold">{pedido.numeroContenedor || 'N/A'}</span></p>
              <p>Naviera: {pedido.naviera || 'N/A'}</p>
              <p className="font-bold">ETA: {pedido.fechaLlegadaEstimada ? format(new Date(pedido.fechaLlegadaEstimada), 'P', { locale: es }) : 'N/A'}</p>
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-secondary mt-2">
                  <Anchor className="w-3 h-3" /> Rastrear Envío
                </a>
              )}
            </div>
          )}

          {/* Bobinas (Tabla) */}
          <div className="mt-6">
            <h4 className="font-bold mb-2">Bobinas Pedidas</h4>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full bg-base-100 shadow-md">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    {pedido.material === 'PVC' && <th>Color</th>}
                    <th>Medidas (Ancho x Largo)</th>
                    <th>Espesor (mm)</th>
                    <th>Precio/m ({divisaOriginal})</th>
                    <th className="font-bold">Coste Final/m (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.bobinas.map(bobina => (
                    <tr key={bobina.id}>
                      <td>{bobina.referencia?.nombre || 'N/A'}</td>
                      {pedido.material === 'PVC' && <td>{bobina.color || 'N/A'}</td>}
                      <td>{bobina.ancho} mm x {bobina.largo} m</td>
                      <td>{bobina.espesor}</td>
                      <td>{bobina.precioMetro.toFixed(2)}</td>
                      <td className="font-bold">{bobina.costoFinalMetro?.toFixed(2) || 'Pendiente'} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          {pedido.notas && (
            <div className="text-sm p-3 bg-base-200 rounded">
              <strong>Notas:</strong> {pedido.notas}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
