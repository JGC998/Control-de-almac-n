"use client";
import React from 'react';
import useSWR from 'swr';
import { X, History } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function MovimientoStockModal({ stockId, materialNombre, onClose }) {
  const { data: movimientos, error, isLoading } = useSWR(stockId ? `/api/movimientos?stockId=${stockId}` : null, fetcher);

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box w-11/12 max-w-3xl">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"><X /></button>
        <h3 className="font-bold text-lg flex items-center mb-4">
          <History className="mr-2" />
          Historial de Movimientos: {materialNombre}
        </h3>
        
        <div className="overflow-x-auto max-h-[60vh]">
          {isLoading && <div className="flex justify-center p-8"><span className="loading loading-spinner"></span></div>}
          {error && <div className="alert alert-error">Error al cargar el historial.</div>}
          {!isLoading && !error && (
            <table className="table table-pin-rows table-sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th className="text-right">Cantidad</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {movimientos?.length > 0 ? (
                  movimientos.map(mov => (
                    <tr key={mov.id} className="hover">
                      <td>{new Date(mov.fecha).toLocaleDateString('es-ES')}</td>
                      <td>
                        <span className={`badge ${mov.tipo.toUpperCase().includes('ENTRADA') ? 'badge-success' : 'badge-error'}`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className={`text-right font-bold ${mov.tipo.toUpperCase().includes('ENTRADA') ? 'text-success' : 'text-error'}`}>
                        {mov.tipo.toUpperCase().includes('ENTRADA') ? '+' : '-'}{mov.cantidad.toFixed(2)} m
                      </td>
                      <td className="text-xs italic opacity-70">{mov.referencia}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4">No hay movimientos para este ítem.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
