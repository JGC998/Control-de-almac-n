"use client";
import { useState } from 'react';
import useSWR from 'swr';
import { Clock, ChevronDown, RotateCcw, X } from 'lucide-react';

export default function ModalHistorialCliente({ clienteId, clienteNombre, onCargar }) {
  const [isOpen, setIsOpen]           = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [itemsMap, setItemsMap]       = useState({});
  const [loadingId, setLoadingId]     = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);

  const { data, isLoading } = useSWR(
    isOpen && clienteId ? `/api/pedidos?clientId=${clienteId}&limit=20` : null
  );

  const pedidos = data?.data ?? [];

  function cerrar() {
    setIsOpen(false);
    setExpandedId(null);
    setConfirmandoId(null);
  }

  async function toggleExpand(pedidoId) {
    if (expandedId === pedidoId) {
      setExpandedId(null);
      setConfirmandoId(null);
      return;
    }
    setExpandedId(pedidoId);
    setConfirmandoId(null);
    if (!itemsMap[pedidoId]) {
      setLoadingId(pedidoId);
      try {
        const res  = await fetch(`/api/pedidos/${pedidoId}`);
        const data = await res.json();
        setItemsMap(prev => ({ ...prev, [pedidoId]: data.items ?? [] }));
      } finally {
        setLoadingId(null);
      }
    }
  }

  function cargar(pedido) {
    const items = itemsMap[pedido.id] ?? [];
    const nuevos = items.map(item => ({
      id:               Date.now() + Math.random(),
      descripcion:      item.descripcion,
      quantity:         item.quantity,
      unitPrice:        item.unitPrice,
      productoId:       item.productoId  || null,
      pesoUnitario:     item.pesoUnitario || 0,
      detallesTecnicos: item.detallesTecnicos || null,
      costoUnitario:    0,
      producto:         item.producto    || null,
    }));
    onCargar(nuevos, pedido.marginId || null);
    cerrar();
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm btn-outline gap-1 ${!clienteId ? 'btn-disabled' : ''}`}
        onClick={() => clienteId && setIsOpen(true)}
        title={clienteId ? 'Ver pedidos anteriores de este cliente' : 'Selecciona un cliente primero'}
      >
        <Clock className="w-3.5 h-3.5" />
        Historial de cliente
      </button>

      {isOpen && (
        <div className="modal modal-open z-40">
          <div className="modal-box w-11/12 max-w-xl p-0 overflow-hidden flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="font-bold text-base leading-none">Historial de pedidos</h3>
                  <p className="text-xs text-base-content/50 mt-0.5">{clienteNombre}</p>
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={cerrar}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-base-200">
              {isLoading && (
                <div className="flex justify-center py-10">
                  <span className="loading loading-spinner" />
                </div>
              )}

              {!isLoading && pedidos.length === 0 && (
                <div className="text-center py-10 text-base-content/30 text-sm">
                  Este cliente no tiene pedidos anteriores
                </div>
              )}

              {pedidos.map(p => {
                const isExpanded     = expandedId === p.id;
                const items          = itemsMap[p.id];
                const isLoadingItems = loadingId === p.id;
                const isConfirming   = confirmandoId === p.id;
                const total          = Number(p.total ?? 0);
                const badgeClass     = p.estado === 'Facturado'
                  ? 'badge-success'
                  : p.estado === 'Cancelado'
                    ? 'badge-error'
                    : 'badge-warning';

                return (
                  <div key={p.id} className={isExpanded ? 'bg-primary/5' : ''}>
                    {/* Fila principal */}
                    <div
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-base-200/60 transition-colors"
                      onClick={() => toggleExpand(p.id)}
                    >
                      <span className="font-mono text-xs font-semibold text-primary min-w-[110px]">
                        {p.numero}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {new Date(p.fechaCreacion).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <span className={`badge badge-xs ${badgeClass}`}>{p.estado}</span>
                      <span className="ml-auto text-sm font-semibold tabular-nums">
                        {total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                      <ChevronDown className={`w-4 h-4 text-base-content/30 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="px-5 pb-4 border-t border-primary/10">
                        {isLoadingItems && (
                          <div className="flex justify-center py-4">
                            <span className="loading loading-spinner loading-sm" />
                          </div>
                        )}

                        {!isLoadingItems && items && (
                          <>
                            <div className="mt-3 space-y-1.5">
                              {items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 text-base-content/70">{item.descripcion}</span>
                                  <span className="badge badge-ghost badge-xs font-mono">×{item.quantity}</span>
                                  <span className="tabular-nums text-base-content/50 min-w-[65px] text-right">
                                    {Number(item.unitPrice).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                              {isConfirming ? (
                                <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5 text-xs">
                                  <span className="text-base-content/70">¿Reemplazar las líneas actuales?</span>
                                  <button type="button" className="btn btn-xs btn-success" onClick={() => cargar(p)}>
                                    Sí, cargar
                                  </button>
                                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => setConfirmandoId(null)}>
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm gap-1"
                                  onClick={() => setConfirmandoId(p.id)}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Cargar este pedido
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="text-xs text-base-content/30 text-center py-2 border-t border-base-200 shrink-0">
              Últimos 20 pedidos · Los cancelados también se pueden cargar
            </div>
          </div>
          <div className="modal-backdrop" onClick={cerrar} />
        </div>
      )}
    </>
  );
}
