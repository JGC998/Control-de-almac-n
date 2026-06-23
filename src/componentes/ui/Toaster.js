'use client';
import { useState, useEffect } from 'react';
import { subscribeToasts } from '@/lib/toast';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { cls: 'alert-success',  Icon: CheckCircle  },
  error:   { cls: 'alert-error',    Icon: AlertTriangle },
  warning: { cls: 'alert-warning',  Icon: AlertTriangle },
  info:    { cls: 'alert-info',     Icon: Info          },
};

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    return subscribeToasts(({ id, msg, type, duration }) => {
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => dismiss(id), duration);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      className="toast toast-end toast-top z-[100] gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(({ id, msg, type }) => {
        const { cls, Icon } = CONFIG[type] || CONFIG.success;
        return (
          <div key={id} className={`alert ${cls} shadow-lg max-w-sm animate-in slide-in-from-right`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium flex-1">{msg}</span>
            <button
              className="btn btn-xs btn-ghost btn-circle opacity-70 hover:opacity-100"
              onClick={() => dismiss(id)}
              aria-label="Cerrar notificación"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
