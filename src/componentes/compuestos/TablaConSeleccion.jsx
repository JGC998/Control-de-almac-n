'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, Square, Download, CheckCircle, XCircle, Trash2, X } from 'lucide-react';
import { toastError } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';

// ── Utilidades ───────────────────────────────────────────────────────────────

function obtenerValorAnidado(obj, ruta) {
  if (!ruta) return undefined;
  return ruta.split('.').reduce((acc, p) => acc?.[p], obj);
}

const variantMap = {
  exito: 'badge-success', error: 'badge-error',
  advertencia: 'badge-warning', info: 'badge-info',
  neutral: 'badge-neutral', primario: 'badge-primary',
};

function renderCelda(fila, columna) {
  const valor = obtenerValorAnidado(fila, columna.clave);
  switch (columna.formato) {
    case 'moneda': return `${Number(valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    case 'fecha':  return valor ? new Date(valor).toLocaleDateString('es-ES') : '-';
    case 'insignia': {
      const v = (columna.insigniaConfig || {})[valor] || 'neutral';
      return <span className={`badge badge-sm ${variantMap[v] || 'badge-neutral'}`}>{valor}</span>;
    }
    default: return valor ?? '-';
  }
}

function exportarCSV(datos, columnas, nombre) {
  const headers = columnas.map(c => c.etiqueta).join(',');
  const rows = datos.map(fila =>
    columnas.map(col => {
      const v = obtenerValorAnidado(fila, col.clave);
      const str = v == null ? '' : String(v);
      return str.includes(',') ? `"${str}"` : str;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Acciones por tipo ────────────────────────────────────────────────────────

function getAcciones(tipo) {
  if (tipo === 'pedido') {
    return [
      {
        label: 'Marcar Facturado',
        icon: CheckCircle,
        variant: 'btn-success',
        confirm: '¿Marcar los pedidos seleccionados como Facturado?',
        onClick: async (ids) => {
          const res = await fetch('/api/pedidos/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, estado: 'Facturado' }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
        },
      },
      {
        label: 'Cancelar',
        icon: XCircle,
        variant: 'btn-error btn-outline',
        confirm: '¿Cancelar los pedidos seleccionados? Esta acción no se puede deshacer fácilmente.',
        onClick: async (ids) => {
          const res = await fetch('/api/pedidos/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, estado: 'Cancelado' }),
          });
          if (!res.ok) throw new Error('Error al cancelar');
        },
      },
    ];
  }

  if (tipo === 'presupuesto') {
    return [
      {
        label: 'Marcar Aceptado',
        icon: CheckCircle,
        variant: 'btn-success',
        confirm: '¿Marcar los presupuestos seleccionados como Aceptado?',
        onClick: async (ids) => {
          const res = await fetch('/api/presupuestos/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, estado: 'Aceptado' }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
        },
      },
      {
        label: 'Rechazar',
        icon: XCircle,
        variant: 'btn-error btn-outline',
        confirm: '¿Marcar los presupuestos seleccionados como Rechazado?',
        onClick: async (ids) => {
          const res = await fetch('/api/presupuestos/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, estado: 'Rechazado' }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
        },
      },
    ];
  }

  return [];
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function TablaConSeleccion({
  tipo,
  datos = [],
  columnas = [],
  rutaBase = null,
  campoEnlace = 'id',
  mensajeVacio = 'No hay datos.',
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const { confirmar, ModalConfirmacion } = useConfirmacion();

  const acciones = getAcciones(tipo);
  const selectedIds = [...selected];
  const selectedDatos = datos.filter(d => selected.has(d[campoEnlace]));
  const allSelected = datos.length > 0 && selected.size === datos.length;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(datos.map(d => d[campoEnlace])));
  }, [allSelected, datos, campoEnlace]);

  const toggleOne = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAccion = async (accion) => {
    if (accion.confirm) {
      const ok = await confirmar({ titulo: accion.confirm });
      if (!ok) return;
    }
    setError(null);
    try {
      await accion.onClick(selectedIds);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e.message || 'Error al ejecutar la acción');
    }
  };

  const handleExportCSV = () => {
    exportarCSV(selectedDatos.length ? selectedDatos : datos, columnas, tipo + 's');
  };

  if (datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-base-content/30">
        <p className="text-sm">{mensajeVacio}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <ModalConfirmacion />
      {error && (
        <div className="alert alert-error mb-2 py-2 text-sm">
          <span>{error}</span>
          <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm table-zebra w-full">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-base-content/50">
              <th className="w-10">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={allSelected}
                  onChange={toggleAll}
                  title="Seleccionar todo"
                />
              </th>
              {columnas.map((col, i) => <th key={col.clave || i}>{col.etiqueta}</th>)}
              {rutaBase && <th />}
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, i) => {
              const id = fila[campoEnlace];
              const isSelected = selected.has(id);
              return (
                <tr
                  key={id || i}
                  className={`hover cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => toggleOne(id)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={isSelected}
                      onChange={() => toggleOne(id)}
                    />
                  </td>
                  {columnas.map((col, ci) => (
                    <td key={col.clave || ci} onClick={ci === 0 ? e => e.stopPropagation() : undefined}>
                      {ci === 0 && rutaBase ? (
                        <Link
                          href={`${rutaBase}/${id}`}
                          className="link link-primary font-semibold font-mono text-sm"
                        >
                          {renderCelda(fila, col)}
                        </Link>
                      ) : renderCelda(fila, col)}
                    </td>
                  ))}
                  {rutaBase && (
                    <td className="text-right" onClick={e => e.stopPropagation()}>
                      <Link href={`${rutaBase}/${id}`} className="btn btn-xs btn-ghost min-h-11 touch-manipulation">
                        Ver →
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra de acciones en bloque */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-neutral text-neutral-content rounded-2xl shadow-2xl border border-neutral-focus animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-semibold mr-1">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>

          {acciones.map(accion => {
            const Icon = accion.icon;
            return (
              <button
                key={accion.label}
                className={`btn btn-sm gap-1.5 ${accion.variant}`}
                disabled={isPending}
                onClick={() => handleAccion(accion)}
              >
                <Icon className="w-3.5 h-3.5" />
                {accion.label}
              </button>
            );
          })}

          <button
            className="btn btn-sm btn-ghost gap-1.5"
            onClick={handleExportCSV}
            title="Exportar selección a CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            className="btn btn-sm btn-ghost btn-circle ml-1"
            onClick={() => setSelected(new Set())}
            title="Cancelar selección"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
