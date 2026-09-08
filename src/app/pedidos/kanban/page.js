"use client";
import React, { useState, useCallback, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import Link from 'next/link';
import { ArrowLeft, Package, RefreshCw, ExternalLink } from 'lucide-react';

const COLUMNS = [
  { id: 'Pendiente', label: 'Pendiente',  badge: 'badge-warning',  desc: 'Por fabricar' },
  { id: 'EnTaller',  label: 'En Taller',  badge: 'badge-info',     desc: 'En producción' },
  { id: 'Listo',     label: 'Listo',      badge: 'badge-success',  desc: 'Preparado para entrega' },
  { id: 'Facturado', label: 'Facturado',  badge: 'badge-neutral',  desc: 'Entregado y facturado' },
];

function getColumna(pedido) {
  if (pedido.estado === 'Cancelado' || pedido.estado === 'Borrador') return null;
  if (pedido.estado === 'Facturado') return 'Facturado';
  if (pedido.tallerEstado === 'Listo')    return 'Listo';
  if (pedido.tallerEstado === 'EnTaller') return 'EnTaller';
  return 'Pendiente';
}

async function moverPedido(id, destino) {
  const updates = {};
  if (destino === 'Facturado') {
    updates.estado       = 'Facturado';
    updates.tallerEstado = 'Entregado';
  } else {
    updates.tallerEstado = destino; // Pendiente, EnTaller, Listo
  }
  const res = await fetch(`/api/pedidos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Error al actualizar estado');
}

function KanbanCard({ pedido, onDragStart, onDragEnd, isDragging }) {
  const fecha = pedido.fechaCreacion
    ? new Date(pedido.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : '';
  const total = Number(pedido.total ?? 0);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, pedido.id)}
      onDragEnd={onDragEnd}
      className={`card bg-base-100 shadow-sm border transition-all select-none
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
        hover:shadow-md hover:border-primary/40 active:cursor-grabbing cursor-grab border-base-200`}
    >
      <div className="card-body p-3 gap-1">
        <div className="flex items-start justify-between gap-1">
          <span className="font-bold text-sm font-mono text-primary">{pedido.numero}</span>
          <span className="text-xs text-base-content/40 shrink-0 mt-0.5">{fecha}</span>
        </div>
        {pedido.cliente?.nombre && (
          <p className="text-xs text-base-content/60 truncate">{pedido.cliente.nombre}</p>
        )}
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-base-200">
          {total > 0 ? (
            <span className="text-xs font-semibold">
              {total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </span>
          ) : <span />}
          <Link
            href={`/pedidos/${pedido.id}`}
            onClick={e => e.stopPropagation()}
            className="btn btn-ghost btn-xs p-0.5 h-auto opacity-40 hover:opacity-100"
          >
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const SWR_KEY = '/api/pedidos?limit=500';

export default function PedidosKanban() {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [moving, setMoving] = useState(false);

  const { data, isLoading, error } = useSWR(SWR_KEY);

  const grouped = useMemo(() => {
    const pedidos = data?.data ?? [];
    const result = {};
    for (const col of COLUMNS) result[col.id] = [];
    for (const p of pedidos) {
      const col = getColumna(p);
      if (col) result[col].push(p);
    }
    return result;
  }, [data]);

  const handleDragStart = useCallback((e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
  }, []);

  const handleDragOver = useCallback((e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCol(null);
    }
  }, []);

  const handleDrop = useCallback(async (e, colId) => {
    e.preventDefault();
    const id = draggingId || e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverCol(null);
    if (!id || moving) return;

    const pedido = data?.data?.find(p => p.id === id);
    if (!pedido) return;
    const colActual = getColumna(pedido);
    if (colActual === colId) return;

    setMoving(true);
    try {
      await moverPedido(id, colId);
      globalMutate(SWR_KEY);
    } catch {
      /* silencioso */
    } finally {
      setMoving(false);
    }
  }, [draggingId, moving, data]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );

  if (error) return (
    <div className="container mx-auto p-6">
      <div className="alert alert-error">Error al cargar los pedidos.</div>
    </div>
  );

  const total = COLUMNS.reduce((s, c) => s + grouped[c.id].length, 0);

  return (
    <div className="p-4 min-h-screen">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/pedidos?estado=Pendiente" className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="w-4 h-4" /> Lista
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" /> Kanban de Pedidos
          </h1>
          <span className="badge badge-ghost">{total} pedidos activos</span>
        </div>
        <button
          className={`btn btn-ghost btn-sm gap-1 ${moving ? 'loading' : ''}`}
          onClick={() => globalMutate(SWR_KEY)}
          disabled={moving}
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(col => (
          <div
            key={col.id}
            className={`rounded-xl border-2 transition-colors ${
              dragOverCol === col.id
                ? 'border-primary bg-primary/5'
                : 'border-base-300 bg-base-200/40'
            }`}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.id)}
          >
            {/* Cabecera columna */}
            <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">{col.label}</span>
                <p className="text-xs text-base-content/40">{col.desc}</p>
              </div>
              <span className={`badge badge-sm ${col.badge}`}>{grouped[col.id].length}</span>
            </div>

            {/* Cards */}
            <div className="p-3 flex flex-col gap-2 min-h-[180px]">
              {grouped[col.id].map(pedido => (
                <KanbanCard
                  key={pedido.id}
                  pedido={pedido}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggingId === pedido.id}
                />
              ))}
              {grouped[col.id].length === 0 && (
                <div className="flex items-center justify-center h-16 text-base-content/20 text-xs border-2 border-dashed border-base-300 rounded-lg">
                  Arrastra aquí
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
