'use client';
import { useState } from 'react';
import { Printer, X, Minus, Plus } from 'lucide-react';
import { generarCodigo } from '@/lib/producto-utils';
import { toastError } from '@/lib/toast';

export default function ModalImprimirEtiquetas({ productos, onCerrar }) {
  const [cantidades, setCantidades] = useState(
    Object.fromEntries(productos.map(p => [p.id, 1])),
  );
  const [generando, setGenerando] = useState(false);

  function setCantidad(id, val) {
    const n = Math.max(1, Math.min(99, parseInt(val) || 1));
    setCantidades(prev => ({ ...prev, [id]: n }));
  }

  const total = Object.values(cantidades).reduce((s, n) => s + n, 0);
  const paginas15 = Math.ceil(total / 32);
  const paginas10 = Math.ceil(total / 50);

  async function generar() {
    setGenerando(true);
    try {
      const items = productos.map(p => ({ id: p.id, cantidad: cantidades[p.id] ?? 1 }));
      const res = await fetch('/api/productos/etiquetas-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Error al generar etiquetas');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `etiquetas-${total}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onCerrar();
    } catch {
      toastError('No se pudieron generar las etiquetas');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box w-11/12 max-w-lg">
        <button onClick={onCerrar} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Printer className="w-5 h-5" /> Imprimir etiquetas
        </h3>

        <p className="text-sm text-base-content/60 mb-4">
          Selecciona cuántas copias de cada código quieres imprimir. El PDF incluye dos secciones: etiquetas de <strong>15 mm</strong> de alto (para troqueles grandes) y de <strong>10 mm</strong> de alto (para troqueles pequeños).
        </p>

        <div className="overflow-y-auto max-h-80 mb-4 border border-base-200 rounded-lg">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th className="text-center w-32">Copias</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => {
                const code = generarCodigo(p);
                return (
                  <tr key={p.id}>
                    <td className="text-sm font-medium max-w-[160px] truncate" title={p.nombre}>
                      {p.nombre}
                    </td>
                    <td>
                      {code && (
                        <span className="font-mono text-xs bg-base-200 px-1.5 py-0.5 rounded tracking-tight">
                          {code}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => setCantidad(p.id, (cantidades[p.id] ?? 1) - 1)}
                          disabled={(cantidades[p.id] ?? 1) <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={cantidades[p.id] ?? 1}
                          onChange={e => setCantidad(p.id, e.target.value)}
                          className="input input-xs input-bordered w-12 text-center font-mono"
                        />
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => setCantidad(p.id, (cantidades[p.id] ?? 1) + 1)}
                          disabled={(cantidades[p.id] ?? 1) >= 99}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-base-content/50">
            {total} etiqueta{total !== 1 ? 's' : ''} · 15mm: {paginas15} pág · 10mm: {paginas10} pág
          </p>
          <div className="flex gap-2">
            <button onClick={onCerrar} className="btn btn-ghost btn-sm">Cancelar</button>
            <button
              onClick={generar}
              disabled={generando || total === 0}
              className="btn btn-primary btn-sm gap-1"
            >
              {generando
                ? <span className="loading loading-spinner loading-xs" />
                : <Printer className="w-4 h-4" />
              }
              Generar PDF
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCerrar} />
    </div>
  );
}
