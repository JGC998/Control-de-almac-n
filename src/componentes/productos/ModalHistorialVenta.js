"use client";
import React, { useMemo } from 'react';
import useSWR from 'swr';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (v, d = 2) => v != null
  ? Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
  : '—';

function fmtFecha(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Sparkline({ puntos, gradId }) {
  if (!puntos || puntos.length < 2) return null;
  const precios = puntos.map(p => p.precio);
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = max - min || 1;
  const W = 320, H = 80, PAD = 8;
  const iW = W - PAD * 2, iH = H - PAD * 2;
  const xStep = iW / (puntos.length - 1);
  const y = v => PAD + iH - ((v - min) / rango) * iH;
  const points = puntos.map((p, i) => `${PAD + i * xStep},${y(p.precio)}`).join(' ');
  const area = `M ${PAD},${H - PAD} ` + puntos.map((p, i) => `L ${PAD + i * xStep},${y(p.precio)}`).join(' ') + ` L ${PAD + (puntos.length - 1) * xStep},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(var(--s))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(var(--s))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke="oklch(var(--s))" strokeWidth="2" strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle key={i} cx={PAD + i * xStep} cy={y(p.precio)} r="3" fill="oklch(var(--s))" />
      ))}
      <text x={PAD} y={H - 1} fontSize="9" fill="currentColor" opacity="0.4">{fmtFecha(puntos[0].creadoEn)}</text>
      <text x={W - PAD} y={H - 1} fontSize="9" fill="currentColor" opacity="0.4" textAnchor="end">{fmtFecha(puntos[puntos.length - 1].creadoEn)}</text>
    </svg>
  );
}

export default function ModalHistorialVenta({ row, onClose }) {
  const url = row ? `/api/tarifas-venta-historial?material=${encodeURIComponent(row.material)}&espesor=${row.espesor}` : null;
  const gradId = row ? `ventagrad-${row.id}` : 'ventagrad';
  const { data: historial, isLoading } = useSWR(url);

  const puntosOrdenados = useMemo(() => {
    if (!Array.isArray(historial)) return [];
    return [...historial].sort((a, b) => new Date(a.creadoEn) - new Date(b.creadoEn));
  }, [historial]);

  // Para precio de venta: subida = bueno (success), bajada = malo (error)
  const variacion = useMemo(() => {
    if (puntosOrdenados.length < 2) return null;
    const ultimo   = puntosOrdenados[puntosOrdenados.length - 1].precio;
    const anterior = puntosOrdenados[puntosOrdenados.length - 2].precio;
    return ((ultimo - anterior) / anterior) * 100;
  }, [puntosOrdenados]);

  if (!row) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg mb-1">
          Historial de precio de venta — {row.material}
        </h3>
        <p className="text-sm text-base-content/50 mb-4">
          Espesor {row.espesor} mm
          {row.lonas ? ` · ${row.lonas} lonas` : ''}
          {row.acabado ? ` · ${row.acabado}` : ''}
        </p>

        {isLoading && (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-md" />
          </div>
        )}

        {!isLoading && puntosOrdenados.length === 0 && (
          <p className="text-center text-base-content/40 py-8 text-sm">
            Sin historial todavía. Se registrará en el próximo cambio de precio desde esta tabla.
          </p>
        )}

        {!isLoading && puntosOrdenados.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat bg-base-200 rounded-xl py-2 px-3">
                <div className="stat-title text-xs">Actual</div>
                <div className="stat-value text-base font-mono text-secondary">
                  {fmt(puntosOrdenados[puntosOrdenados.length - 1].precio)} €
                </div>
              </div>
              <div className="stat bg-base-200 rounded-xl py-2 px-3">
                <div className="stat-title text-xs">Mínimo histórico</div>
                <div className="stat-value text-base font-mono text-error">
                  {fmt(Math.min(...puntosOrdenados.map(p => p.precio)))} €
                </div>
              </div>
              <div className="stat bg-base-200 rounded-xl py-2 px-3">
                <div className="stat-title text-xs">Máximo histórico</div>
                <div className="stat-value text-base font-mono text-success">
                  {fmt(Math.max(...puntosOrdenados.map(p => p.precio)))} €
                </div>
              </div>
            </div>

            {variacion != null && (
              <div className={`flex items-center gap-2 text-sm mb-3 font-semibold ${
                variacion > 0 ? 'text-success' : variacion < 0 ? 'text-error' : 'text-base-content/50'
              }`}>
                {variacion > 0 ? <TrendingUp className="w-4 h-4" /> : variacion < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {variacion > 0 ? '+' : ''}{fmt(variacion, 1)}% vs precio anterior
              </div>
            )}

            {puntosOrdenados.length >= 2 && (
              <div className="bg-base-200 rounded-xl p-3 mb-4">
                <Sparkline puntos={puntosOrdenados} gradId={gradId} />
              </div>
            )}

            <div className="overflow-x-auto max-h-52">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="text-right">Precio venta (€/m²)</th>
                    <th className="text-right">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {[...puntosOrdenados].reverse().map((p, i, arr) => {
                    const prev  = arr[i + 1];
                    const delta = prev ? ((p.precio - prev.precio) / prev.precio) * 100 : null;
                    return (
                      <tr key={p.id} className="hover">
                        <td className="tabular-nums">{fmtFecha(p.creadoEn)}</td>
                        <td className="text-right font-mono font-semibold">{fmt(p.precio)} €</td>
                        <td className={`text-right font-mono text-xs ${
                          delta == null ? 'opacity-30' : delta > 0 ? 'text-success' : delta < 0 ? 'text-error' : 'opacity-30'
                        }`}>
                          {delta != null ? `${delta > 0 ? '+' : ''}${fmt(delta, 1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="modal-action mt-4">
          <button className="btn btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
