"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Layers, Search, ArrowRight, Trash2, Package } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utilidades';
import { mutate } from 'swr';

export default function BandasPVCPage() {
  const [busqueda, setBusqueda] = useState('');
  const { data, isLoading, error } = useSWR('/api/productos?q=BANDA_PVC&limit=500');
  const bandas = data?.data ?? data ?? [];

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return bandas;
    const q = busqueda.toLowerCase();
    return bandas.filter(b =>
      b.nombre?.toLowerCase().includes(q) ||
      b.color?.toLowerCase().includes(q) ||
      String(b.espesor ?? '').includes(q) ||
      String(b.ancho ?? '').includes(q)
    );
  }, [bandas, busqueda]);

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar la banda "${nombre}"?`)) return;
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    mutate('/api/productos?q=BANDA_PVC&limit=500');
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/almacen" className="btn btn-ghost btn-sm btn-circle">
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Link>
        <Layers className="w-7 h-7 text-info" />
        <h1 className="text-3xl font-bold">Bandas PVC guardadas</h1>
      </div>
      <p className="text-sm text-base-content/50 mb-6 ml-14">
        Bandas calculadas y guardadas desde la calculadora. Haz clic en una para ver todos sus datos.
      </p>

      {/* Buscador */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          className="input input-bordered w-full pl-9"
          placeholder="Buscar por nombre, color, espesor…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error">Error al cargar las bandas.</div>
      )}

      {!isLoading && !error && filtradas.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          {bandas.length === 0
            ? <><p className="font-medium">No hay bandas guardadas todavía.</p><p className="text-sm mt-1">Calcula una banda y pulsa "Guardar en catálogo" para que aparezca aquí.</p></>
            : <p>No hay bandas que coincidan con "{busqueda}".</p>
          }
        </div>
      )}

      {filtradas.length > 0 && (
        <div className="card bg-base-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Nombre / Referencia</th>
                  <th className="text-center">Espesor</th>
                  <th className="text-center">Color</th>
                  <th className="text-center">Ancho</th>
                  <th className="text-center">Largo</th>
                  <th className="text-right">Precio unit.</th>
                  <th className="text-right">Peso unit.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(b => (
                  <tr key={b.id} className="hover">
                    <td>
                      <Link
                        href={`/gestion/productos/${b.id}`}
                        className="font-semibold link link-hover text-sm"
                      >
                        {b.nombre}
                      </Link>
                    </td>
                    <td className="text-center font-mono text-sm">
                      {b.espesor != null ? `${b.espesor} mm` : '—'}
                    </td>
                    <td className="text-center">
                      {b.color
                        ? <span className="badge badge-ghost badge-sm">{b.color}</span>
                        : <span className="text-base-content/30">—</span>
                      }
                    </td>
                    <td className="text-center font-mono text-sm">
                      {b.ancho != null ? `${b.ancho} mm` : '—'}
                    </td>
                    <td className="text-center font-mono text-sm">
                      {b.largo != null ? `${b.largo} mm` : '—'}
                    </td>
                    <td className="text-right font-semibold text-primary">
                      {formatCurrency(b.precioUnitario)}
                    </td>
                    <td className="text-right text-sm text-base-content/60">
                      {b.pesoUnitario != null ? `${formatWeight(b.pesoUnitario)} kg` : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/gestion/productos/${b.id}`}
                          className="btn btn-xs btn-ghost"
                          title="Ver detalle"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => handleEliminar(b.id, b.nombre)}
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-base-content/40 border-t border-base-200">
            {filtradas.length} banda{filtradas.length !== 1 ? 's' : ''}
            {busqueda && ` · filtrando por "${busqueda}"`}
          </div>
        </div>
      )}
    </div>
  );
}
