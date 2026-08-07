"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Trash2, ArrowLeft, FileCheck, Search } from 'lucide-react';
import Link from 'next/link';

const itemVacio = () => ({ descripcion: '', quantity: 1, productoId: null });

export default function NuevoAlbaranPage() {
  const router = useRouter();
  const { data: clientesData } = useSWR('/api/clientes?limit=500');
  const clientes = clientesData?.data || [];

  const [clienteId, setClienteId]   = useState('');
  const [items, setItems]            = useState([itemVacio()]);
  const [notas, setNotas]            = useState('');
  const [guardando, setGuardando]    = useState(false);
  const [error, setError]            = useState(null);

  // Búsqueda rápida de producto por nombre para autocompletar descripción
  const [busquedaIdx, setBusquedaIdx]       = useState(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const { data: productosData } = useSWR(
    terminoBusqueda.length >= 2 ? `/api/productos?limit=20&q=${encodeURIComponent(terminoBusqueda)}` : null
  );
  const productosEncontrados = productosData?.data || [];

  const addItem = () => setItems(prev => [...prev, itemVacio()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = useCallback((idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }, []);

  const seleccionarProducto = (idx, producto) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, descripcion: producto.nombre, productoId: producto.id } : item
    ));
    setBusquedaIdx(null);
    setTerminoBusqueda('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const lineasValidas = items.filter(i => i.descripcion.trim() && i.quantity > 0);
    if (lineasValidas.length === 0) {
      setError('Añade al menos un ítem con descripción y cantidad.');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch('/api/albaranes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteId || null,
          items: lineasValidas.map(i => ({
            descripcion: i.descripcion.trim(),
            quantity: Number(i.quantity),
            productoId: i.productoId || null,
          })),
          notas: notas.trim() || null,
          valorado: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al crear el albarán');
      }

      const albaran = await res.json();
      router.push(`/albaranes/${albaran.id}`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/albaranes" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Albaranes
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="w-6 h-6" /> Nuevo albarán de entrega
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">Cliente</h2>
            <select
              className="select select-bordered w-full"
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
            >
              <option value="">— Sin cliente (anónimo) —</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ítems */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">Artículos entregados</h2>

            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr>
                    <th className="w-auto">Descripción</th>
                    <th className="w-24 text-center">Cantidad</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="relative">
                      {/* Descripción con buscador de producto */}
                      <td className="relative">
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            className="input input-bordered input-sm flex-1"
                            placeholder="Descripción del artículo"
                            value={item.descripcion}
                            onChange={e => {
                              updateItem(idx, 'descripcion', e.target.value);
                              updateItem(idx, 'productoId', null);
                            }}
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square"
                            title="Buscar producto"
                            onClick={() => {
                              setBusquedaIdx(idx === busquedaIdx ? null : idx);
                              setTerminoBusqueda('');
                            }}
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Dropdown búsqueda producto */}
                        {busquedaIdx === idx && (
                          <div className="absolute z-50 left-0 top-full mt-1 w-full bg-base-100 border border-base-300 rounded shadow-xl">
                            <div className="p-2">
                              <input
                                type="text"
                                className="input input-bordered input-sm w-full"
                                placeholder="Buscar producto por nombre..."
                                autoFocus
                                value={terminoBusqueda}
                                onChange={e => setTerminoBusqueda(e.target.value)}
                              />
                            </div>
                            {productosEncontrados.length > 0 && (
                              <ul className="max-h-48 overflow-y-auto">
                                {productosEncontrados.map(p => (
                                  <li key={p.id}>
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-2 hover:bg-base-200 text-sm"
                                      onClick={() => seleccionarProducto(idx, p)}
                                    >
                                      <span className="font-medium">{p.nombre}</span>
                                      {p.referenciaFabricante && (
                                        <span className="text-xs text-base-content/50 ml-2">{p.referenciaFabricante}</span>
                                      )}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {terminoBusqueda.length >= 2 && productosEncontrados.length === 0 && (
                              <p className="p-3 text-sm text-base-content/50">Sin resultados</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cantidad */}
                      <td>
                        <input
                          type="number"
                          className="input input-bordered input-sm w-full text-center"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          required
                        />
                      </td>

                      {/* Eliminar */}
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square text-error"
                          onClick={() => removeItem(idx)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn btn-outline btn-sm gap-1 w-fit" onClick={addItem}>
              <Plus className="w-4 h-4" /> Añadir línea
            </button>
          </div>
        </div>

        {/* Notas */}
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body gap-2">
            <h2 className="card-title text-base">Observaciones (opcional)</h2>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="Notas para el albarán..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/albaranes" className="btn btn-ghost">Cancelar</Link>
          <button type="submit" className="btn btn-primary gap-2" disabled={guardando}>
            {guardando ? <span className="loading loading-spinner loading-sm" /> : <FileCheck className="w-4 h-4" />}
            Generar albarán
          </button>
        </div>
      </form>
    </div>
  );
}
