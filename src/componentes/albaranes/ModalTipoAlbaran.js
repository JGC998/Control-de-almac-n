"use client";
import { FileText, EyeOff } from 'lucide-react';

// Modal que pregunta si el albarán es valorado o sin valorar.
// onConfirm(valorado: boolean) — llama con true=valorado, false=sin valorar
// onCancel() — cierra sin generar
export default function ModalTipoAlbaran({ pedido, onConfirm, onCancel }) {
  if (!pedido) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-300 w-full max-w-md mx-4 overflow-hidden">

        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 border-b border-base-200">
          <h3 className="text-lg font-bold">Generar albarán</h3>
          <p className="text-sm text-base-content/60 mt-0.5">
            Pedido <span className="font-mono font-semibold">{pedido.numero}</span>
            {pedido.cliente?.nombre ? ` · ${pedido.cliente.nombre}` : ''}
          </p>
        </div>

        {/* Opciones */}
        <div className="p-6 space-y-3">
          <button
            onClick={() => onConfirm(true)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-base-300 hover:border-primary hover:bg-primary/5 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">Albarán valorado</div>
              <div className="text-xs text-base-content/55 mt-0.5 leading-relaxed">
                El PDF muestra precios unitarios y totales. El cliente ve el importe de la entrega.
              </div>
            </div>
          </button>

          <button
            onClick={() => onConfirm(false)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-base-300 hover:border-warning hover:bg-warning/5 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 group-hover:bg-warning/20 transition-colors">
              <EyeOff className="w-5 h-5 text-warning" />
            </div>
            <div>
              <div className="font-semibold text-sm">Albarán sin valorar</div>
              <div className="text-xs text-base-content/55 mt-0.5 leading-relaxed">
                El PDF solo muestra descripción y cantidades, sin precios. Los datos económicos se conservan internamente para la factura.
              </div>
            </div>
          </button>
        </div>

        {/* Cancelar */}
        <div className="px-6 pb-5">
          <button
            onClick={onCancel}
            className="w-full btn btn-ghost btn-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
