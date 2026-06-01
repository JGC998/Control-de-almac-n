"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';

const TIPO_COLOR = {
  PENDIENTE: 'badge-warning',
  ALERTA:    'badge-error',
  INFO:      'badge-info',
};

const TIPO_LABEL = {
  PENDIENTE: 'Pendiente',
  ALERTA:    'Alerta',
  INFO:      'Info',
};

export default function CampanaNotificaciones() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useSWR('/api/notificaciones', {
    refreshInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  const noLeidas  = data?.noLeidas ?? 0;
  const notifs    = data?.notificaciones ?? [];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function marcarLeida(id) {
    const res = await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
    if (res.ok) mutate('/api/notificaciones');
  }

  async function marcarTodasLeidas() {
    const res = await fetch('/api/notificaciones', { method: 'PATCH' });
    if (res.ok) mutate('/api/notificaciones');
  }

  async function eliminar(id, e) {
    e.stopPropagation();
    const res = await fetch(`/api/notificaciones/${id}`, { method: 'DELETE' });
    if (res.ok) mutate('/api/notificaciones');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="btn btn-ghost btn-sm btn-circle relative"
        title="Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-error text-error-content text-[10px] font-bold rounded-full flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-base-100 rounded-box shadow-xl border border-base-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-200">
            <span className="font-semibold text-sm">Notificaciones</span>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodasLeidas}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <ul className="max-h-96 overflow-y-auto divide-y divide-base-200">
            {notifs.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-base-content/40">
                Sin notificaciones
              </li>
            )}
            {notifs.map(n => (
              <li
                key={n.id}
                className={`flex gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors ${!n.leida ? 'bg-primary/5' : ''}`}
                onClick={() => !n.leida && marcarLeida(n.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.leida && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    <span className={`badge badge-xs ${TIPO_COLOR[n.tipo] ?? 'badge-ghost'}`}>
                      {TIPO_LABEL[n.tipo] ?? n.tipo}
                    </span>
                    <span className="text-[11px] text-base-content/40 ml-auto">
                      {new Date(n.creadaEn).toLocaleDateString('es-ES', { day:'2-digit', month:'short' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-tight">{n.titulo}</p>
                  <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">{n.mensaje}</p>
                  {n.url && (
                    <Link
                      href={n.url}
                      onClick={() => { marcarLeida(n.id); setOpen(false); }}
                      className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Ver →
                    </Link>
                  )}
                </div>
                <button
                  onClick={(e) => eliminar(n.id, e)}
                  className="btn btn-ghost btn-xs btn-circle opacity-40 hover:opacity-100 shrink-0 self-start mt-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
