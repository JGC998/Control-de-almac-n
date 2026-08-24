"use client";
import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { RefreshCw, Clock } from 'lucide-react';

// ── Constantes ────────────────────────────────────────────────────────────────
const TALLER_ESTADOS = ['Pendiente', 'EnTaller', 'Listo'];

const ESTADO_CFG = {
  Pendiente: {
    label: 'Pendiente',
    bg: 'bg-warning/15 border-warning/40',
    header: 'bg-warning text-warning-content',
    badge: 'badge-warning',
    btn: { label: 'Empezar →', next: 'EnTaller', cls: 'btn-warning' },
  },
  EnTaller: {
    label: 'En taller',
    bg: 'bg-info/15 border-info/40',
    header: 'bg-info text-info-content',
    badge: 'badge-info',
    btn: { label: 'Terminado ✓', next: 'Listo', cls: 'btn-info' },
  },
  Listo: {
    label: 'Listo',
    bg: 'bg-success/15 border-success/40',
    header: 'bg-success text-success-content',
    badge: 'badge-success',
    btn: { label: 'Entregado →', next: 'Entregado', cls: 'btn-success' },
  },
};

// ── Reloj ─────────────────────────────────────────────────────────────────────
function Reloj() {
  const [hora, setHora] = useState('');
  useEffect(() => {
    const tick = () => setHora(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-2xl font-bold tabular-nums">{hora}</span>;
}

// ── Tarjeta de pedido ─────────────────────────────────────────────────────────
function TarjetaPedido({ pedido, onAvanzar, avanzando }) {
  const cfg = ESTADO_CFG[pedido.tallerEstado];
  const fechaDias = Math.floor((Date.now() - new Date(pedido.fechaCreacion)) / 86400000);

  return (
    <div className={`rounded-2xl border-2 ${cfg.bg} flex flex-col overflow-hidden`}>
      {/* Cabecera */}
      <div className={`${cfg.header} px-4 py-3 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-lg leading-none truncate">
            {pedido.numero}
          </span>
          {fechaDias > 0 && (
            <span className="badge badge-neutral badge-sm shrink-0">
              {fechaDias}d
            </span>
          )}
        </div>
        <span className="text-sm font-semibold truncate text-right opacity-90">
          {pedido.cliente?.nombre ?? '—'}
        </span>
      </div>

      {/* Ítems */}
      <div className="flex-1 px-4 py-3 space-y-1 overflow-y-auto max-h-48">
        {pedido.items.length === 0 ? (
          <p className="text-sm text-base-content/40 italic">Sin ítems</p>
        ) : (
          pedido.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="font-bold shrink-0 text-base-content/50 tabular-nums w-6 text-right">
                {item.quantity}×
              </span>
              <span className="leading-snug text-base-content/90">{item.descripcion}</span>
            </div>
          ))
        )}
      </div>

      {/* Notas */}
      {pedido.notas && (
        <div className="px-4 pb-2">
          <p className="text-xs text-base-content/60 bg-base-200/60 rounded-lg px-3 py-2 leading-snug">
            {pedido.notas}
          </p>
        </div>
      )}

      {/* Botón de avance */}
      <div className="px-4 pb-4 pt-1">
        <button
          className={`btn ${cfg.btn.cls} btn-lg w-full text-base font-bold`}
          onClick={() => onAvanzar(pedido.id, cfg.btn.next)}
          disabled={avanzando}
        >
          {avanzando
            ? <span className="loading loading-spinner loading-sm" />
            : cfg.btn.label}
        </button>
      </div>
    </div>
  );
}

// ── Columna Kanban ─────────────────────────────────────────────────────────────
function Columna({ estado, pedidos, onAvanzar, avanzandoId }) {
  const cfg = ESTADO_CFG[estado];
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Cabecera columna */}
      <div className="flex items-center gap-2 px-1">
        <span className={`badge ${cfg.badge} badge-lg text-base px-4 py-3`}>
          {cfg.label}
        </span>
        <span className="text-base-content/50 text-sm font-semibold">
          {pedidos.length}
        </span>
      </div>

      {/* Tarjetas */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1">
        {pedidos.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-base-300 flex items-center justify-center py-10 text-base-content/25 text-sm">
            Sin pedidos
          </div>
        ) : (
          pedidos.map(p => (
            <TarjetaPedido
              key={p.id}
              pedido={p}
              onAvanzar={onAvanzar}
              avanzando={avanzandoId === p.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function QuioscoPage() {
  const [avanzandoId, setAvanzandoId] = useState(null);
  const [flashMsg, setFlashMsg]       = useState(null);

  const { data: pedidos = [], mutate, isValidating } = useSWR(
    '/api/pedidos/taller',
    { refreshInterval: 30000, revalidateOnFocus: false, keepPreviousData: true }
  );

  // Actualizar estado con un toque
  const handleAvanzar = useCallback(async (id, nuevoEstado) => {
    if (avanzandoId) return;
    setAvanzandoId(id);

    // Optimistic update
    const prevData = pedidos;
    if (nuevoEstado === 'Entregado') {
      // Retirar de la lista
      mutate(pedidos.filter(p => p.id !== id), false);
    } else {
      mutate(
        pedidos.map(p => p.id === id ? { ...p, tallerEstado: nuevoEstado } : p),
        false
      );
    }

    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tallerEstado: nuevoEstado }),
      });
      if (!res.ok) throw new Error('Error del servidor');
      setFlashMsg({ ok: true, text: nuevoEstado === 'Entregado' ? 'Pedido entregado ✓' : `Estado actualizado a ${ESTADO_CFG[nuevoEstado]?.label ?? nuevoEstado}` });
    } catch {
      // Revertir si falla
      mutate(prevData, false);
      setFlashMsg({ ok: false, text: 'Error al actualizar el estado' });
    } finally {
      setAvanzandoId(null);
      setTimeout(() => setFlashMsg(null), 3000);
    }
  }, [pedidos, mutate, avanzandoId]);

  // Agrupar por estado
  const columnas = TALLER_ESTADOS.reduce((acc, estado) => {
    acc[estado] = pedidos.filter(p => p.tallerEstado === estado);
    return acc;
  }, {});

  const totalActivos = pedidos.length;

  return (
    <div className="h-screen flex flex-col bg-base-200 select-none">
      {/* Barra superior */}
      <header className="flex items-center justify-between px-6 py-3 bg-base-100 border-b border-base-300 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-primary">🏭 Taller</span>
          <span className="badge badge-neutral badge-lg">
            {totalActivos} activo{totalActivos !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Flash de confirmación */}
          {flashMsg && (
            <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${flashMsg.ok ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
              {flashMsg.text}
            </span>
          )}

          {/* Indicador de refresco */}
          <button
            onClick={() => mutate()}
            className="btn btn-ghost btn-sm gap-1 text-base-content/50"
            title="Actualizar ahora"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            <span className="text-xs">Auto 30s</span>
          </button>

          <div className="flex items-center gap-2 text-base-content/70">
            <Clock className="w-5 h-5" />
            <Reloj />
          </div>
        </div>
      </header>

      {/* Tablero Kanban */}
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full grid grid-cols-3 gap-4">
          {TALLER_ESTADOS.map(estado => (
            <Columna
              key={estado}
              estado={estado}
              pedidos={columnas[estado] ?? []}
              onAvanzar={handleAvanzar}
              avanzandoId={avanzandoId}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
