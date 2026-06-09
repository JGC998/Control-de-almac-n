"use client";
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/fetcher';
import {
  Ship, Plus, Calculator, MapPin, Trash2, ExternalLink,
  ChevronRight, AlertTriangle, RefreshCw, PackageCheck,
} from 'lucide-react';

const ESTADOS = {
  BORRADOR:  { label: 'Borrador',    color: 'badge-warning',  orden: 1 },
  PEDIDO:    { label: 'Pedido',      color: 'badge-ghost',    orden: 2 },
  TRANSITO:  { label: 'En tránsito', color: 'badge-info',     orden: 3 },
  ADUANA:    { label: 'En aduana',   color: 'badge-warning',  orden: 4 },
  RECIBIDO:  { label: 'Recibido',    color: 'badge-success',  orden: 5 },
};

// El ultimoEvento se guarda como "descripcion|fechaISO"
function parseEvento(str) {
  if (!str) return null;
  const idx = str.lastIndexOf('|');
  if (idx === -1) return { desc: str, fecha: null };
  return {
    desc:  str.slice(0, idx),
    fecha: str.slice(idx + 1) ? new Date(str.slice(idx + 1)) : null,
  };
}

function fmtFecha(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TarjetaContenedor({ imp, onDelete, onMarcarRecibido }) {
  const estado    = ESTADOS[imp.estado] ?? { label: imp.estado, color: 'badge-neutral' };
  const esBorrador = imp.estado === 'BORRADOR';
  const evento    = parseEvento(imp.ultimoEvento);

  return (
    <div className={`card shadow-sm border transition-colors
      ${esBorrador ? 'bg-warning/5 border-warning/20' : 'bg-base-100 border-base-200'}`}>
      <div className="card-body p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Info principal */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge badge-sm ${estado.color}`}>{estado.label}</span>
              {imp.trackingActivo && (
                <span className="badge badge-sm badge-ghost gap-1">
                  <MapPin className="w-2.5 h-2.5" /> Tracking activo
                </span>
              )}
              <span className="font-semibold truncate">
                {imp.descripcion || imp.numContenedor || imp.blNumber || imp.numFactura || 'Sin identificar'}
              </span>
            </div>

            {/* Metadatos */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-base-content/50">
              {imp.numFactura    && <span>Factura: <span className="font-mono">{imp.numFactura}</span></span>}
              {imp.numContenedor && <span>Contenedor: <span className="font-mono">{imp.numContenedor}</span></span>}
              {imp.blNumber      && <span>BL: <span className="font-mono">{imp.blNumber}</span></span>}
              {imp.proveedor     && <span>{imp.proveedor.nombre}</span>}
              <span>{fmtFecha(imp.creadaEn)}</span>
            </div>

            {/* Último evento de tracking */}
            {evento && (
              <p className="text-xs text-base-content/60">
                📍 {evento.desc}
                {evento.fecha && <span className="text-base-content/40 ml-1">· {fmtFecha(evento.fecha)}</span>}
              </p>
            )}

            {/* ETA */}
            {imp.etaEstimada && (
              <p className="text-xs text-primary font-medium">
                🎯 ETA estimada: {fmtFecha(imp.etaEstimada)}
              </p>
            )}

            {/* Aviso borrador sin tracking */}
            {esBorrador && !imp.trackingActivo && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Borrador sin tracking — escaneo desde tablet
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-1 shrink-0 items-start flex-wrap justify-end">
            <button
              className="btn btn-xs btn-success gap-1"
              onClick={() => onMarcarRecibido(imp.id)}
              title="El contenedor ha llegado — detiene el tracking y los avisos WhatsApp"
            >
              <PackageCheck className="w-3 h-3" /> Llegó
            </button>
            <Link
              href={`/herramientas/calculadora-contenedor?cargar=${imp.id}`}
              className="btn btn-xs btn-outline gap-1"
              title="Cargar en la calculadora para completar los gastos"
            >
              <Calculator className="w-3 h-3" /> Calcular gastos
            </Link>
            <button
              className="btn btn-xs btn-ghost text-error"
              onClick={() => onDelete(imp.id)}
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContenedoresPage() {
  const { data: importaciones, isLoading } = useSWR('/api/importaciones', fetcher);
  const { data: usoShip24, mutate: refrescarUso } = useSWR('/api/tracking/uso', fetcher);
  const [sincronizando, setSincronizando] = useState(false);
  const [editandoUso, setEditandoUso] = useState(false);
  const [usoManual, setUsoManual] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este contenedor del listado?')) return;
    await fetch(`/api/importaciones/${id}`, { method: 'DELETE' });
    mutate('/api/importaciones');
  };

  const handleMarcarRecibido = async (id) => {
    if (!confirm('¿Marcar como recibido? Se desactivará el tracking automático y dejarás de recibir avisos WhatsApp para este contenedor.')) return;
    await fetch(`/api/importaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'RECIBIDO', trackingActivo: false }),
    });
    mutate('/api/importaciones');
  };

  const handleCorregirUso = async () => {
    const n = parseInt(usoManual, 10);
    if (isNaN(n) || n < 0) return;
    await fetch('/api/tracking/uso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uso: n }),
    });
    await refrescarUso();
    setEditandoUso(false);
    setUsoManual('');
  };

  const handleSyncNow = async () => {
    setSincronizando(true);
    await fetch('/api/tracking/sync', { method: 'POST' });
    await mutate('/api/importaciones');
    setSincronizando(false);
  };

  const ordenados = [...(importaciones || [])].sort((a, b) => {
    const oa = ESTADOS[a.estado]?.orden ?? 99;
    const ob = ESTADOS[b.estado]?.orden ?? 99;
    if (oa !== ob) return oa - ob;
    return new Date(b.creadaEn) - new Date(a.creadaEn);
  });

  const activos   = ordenados.filter(i => i.estado !== 'RECIBIDO');
  const recibidos = ordenados.filter(i => i.estado === 'RECIBIDO');
  const conTracking = activos.filter(i => i.trackingActivo).length;

  // Contador de trackers Ship24 — leído desde la API (persistente aunque se borren registros)
  const CUOTA_MENSUAL = usoShip24?.cuota ?? 10;
  const trackersEsteMes = usoShip24?.uso ?? 0;
  const cuotaColor = trackersEsteMes >= CUOTA_MENSUAL ? 'badge-error'
    : trackersEsteMes >= CUOTA_MENSUAL - 2 ? 'badge-warning'
    : 'badge-success';
  const resetLabel = usoShip24?.reset ?? '';

  return (
    <div className="container mx-auto p-6 max-w-4xl">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Ship className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contenedores</h1>
            <p className="text-sm text-base-content/50">
              {conTracking > 0
                ? `${conTracking} contenedor${conTracking !== 1 ? 'es' : ''} con seguimiento activo`
                : 'Seguimiento de importaciones y cálculo de costes'}
            </p>
            {usoShip24 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`badge badge-sm ${cuotaColor}`}>
                  {trackersEsteMes} / {CUOTA_MENSUAL} trackers Ship24
                </span>
                <span className="text-xs text-base-content/40">
                  · se reinicia el {resetLabel}
                </span>
                {editandoUso ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="0" max="10"
                      value={usoManual}
                      onChange={e => setUsoManual(e.target.value)}
                      className="input input-xs input-bordered w-12 font-mono"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleCorregirUso(); if (e.key === 'Escape') setEditandoUso(false); }}
                    />
                    <button onClick={handleCorregirUso} className="btn btn-xs btn-primary">✓</button>
                    <button onClick={() => setEditandoUso(false)} className="btn btn-xs btn-ghost">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setUsoManual(String(trackersEsteMes)); setEditandoUso(true); }}
                    className="text-xs text-base-content/30 hover:text-base-content/60 underline"
                    title="Corregir contador manualmente"
                  >
                    corregir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {conTracking > 0 && (
            <button
              className="btn btn-ghost btn-sm gap-1"
              onClick={handleSyncNow}
              disabled={sincronizando}
              title="Forzar comprobación de tracking ahora"
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
              {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
          )}
          <Link href="/herramientas/calculadora-contenedor" className="btn btn-outline btn-sm gap-1">
            <Calculator className="w-4 h-4" /> Nuevo cálculo de gastos
          </Link>
          <Link href="/compras/contenedores/nuevo-rastreador" className="btn btn-primary btn-sm gap-1">
            <Plus className="w-4 h-4" /> Nuevo rastreador
          </Link>
        </div>
      </div>

      {/* Cargando */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {/* Vacío */}
      {!isLoading && ordenados.length === 0 && (
        <div className="text-center py-20 text-base-content/30">
          <Ship className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No hay contenedores todavía</p>
          <p className="text-sm mt-1 mb-6">Crea un rastreador cuando hagas un pedido de importación</p>
          <Link href="/compras/contenedores/nuevo-rastreador" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Crear primer rastreador
          </Link>
        </div>
      )}

      {/* En curso */}
      {activos.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider">
            En curso — {activos.length}
          </h2>
          {activos.map(imp => (
            <TarjetaContenedor key={imp.id} imp={imp} onDelete={handleDelete} onMarcarRecibido={handleMarcarRecibido} />
          ))}
        </div>
      )}

      {/* Recibidos (colapsado) */}
      {recibidos.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-3 list-none">
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
            Recibidos — {recibidos.length}
          </summary>
          <div className="space-y-2">
            {recibidos.map(imp => (
              <div key={imp.id} className="card bg-base-100 shadow-sm border border-base-200 opacity-60 hover:opacity-100 transition-opacity">
                <div className="card-body p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="badge badge-sm badge-success">Recibido</span>
                      <span className="font-medium">{imp.descripcion || imp.numContenedor || imp.numFactura || '—'}</span>
                      {imp.proveedor && <span className="text-base-content/40">{imp.proveedor.nombre}</span>}
                      <span className="text-base-content/40 text-xs">{fmtFecha(imp.creadaEn)}</span>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/herramientas/calculadora-contenedor?cargar=${imp.id}`} className="btn btn-xs btn-ghost gap-1">
                        <ExternalLink className="w-3 h-3" /> Ver costes
                      </Link>
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDelete(imp.id)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

    </div>
  );
}
