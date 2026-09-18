"use client";
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Star, Layers, Ruler, ChevronRight, Filter, X } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

export default function EstrellasPage() {
  const { data: productos, isLoading, error } = useSWR('/api/estrellas', fetcher);

  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroFabricante, setFiltroFabricante] = useState('');

  const materiales = useMemo(() => {
    if (!productos) return [];
    return [...new Set(productos.map(p => p.material?.nombre).filter(Boolean))].sort();
  }, [productos]);

  const fabricantes = useMemo(() => {
    if (!productos) return [];
    return [...new Set(productos.map(p => p.fabricante?.nombre).filter(Boolean))].sort();
  }, [productos]);

  const filtrados = useMemo(() => {
    if (!productos) return [];
    return productos.filter(p => {
      if (filtroMaterial && p.material?.nombre !== filtroMaterial) return false;
      if (filtroFabricante && p.fabricante?.nombre !== filtroFabricante) return false;
      return true;
    });
  }, [productos, filtroMaterial, filtroFabricante]);

  const hayFiltros = filtroMaterial || filtroFabricante;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-warning/10 rounded-xl shrink-0">
          <Star className="w-8 h-8 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Estrellas</h1>
          <p className="text-base-content/60 mt-1 text-sm">
            Productos de tipo estrella. Pulsa en uno para ver sus datos y gestionar las medidas de plancha.
          </p>
        </div>
      </div>

      {/* Filtros */}
      {!isLoading && !error && productos && productos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-base-content/40 shrink-0" />

          <select
            className="select select-sm select-bordered w-auto"
            value={filtroMaterial}
            onChange={e => setFiltroMaterial(e.target.value)}
          >
            <option value="">Todos los materiales</option>
            {materiales.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {fabricantes.length > 0 && (
            <select
              className="select select-sm select-bordered w-auto"
              value={filtroFabricante}
              onChange={e => setFiltroFabricante(e.target.value)}
            >
              <option value="">Todos los fabricantes</option>
              {fabricantes.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}

          {hayFiltros && (
            <button
              className="btn btn-xs btn-ghost gap-1"
              onClick={() => { setFiltroMaterial(''); setFiltroFabricante(''); }}
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}

          {hayFiltros && (
            <span className="text-xs text-base-content/40">
              {filtrados.length} de {productos.length}
            </span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error text-sm">
          Error al cargar los productos. Inténtalo de nuevo.
        </div>
      )}

      {!isLoading && !error && filtrados.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {hayFiltros
              ? 'No hay estrellas que coincidan con los filtros.'
              : 'No se encontraron productos con "Estrella" en el nombre o subfamilia.'}
          </p>
        </div>
      )}

      {!isLoading && !error && filtrados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map(p => (
            <Link
              key={p.id}
              href={`/almacen/estrellas/${p.id}`}
              className="card bg-base-100 shadow border border-base-200 hover:border-warning/40 hover:shadow-md transition-all group"
            >
              <div className="card-body py-4 gap-2">

                {/* Familia / subfamilia */}
                <div className="flex items-center gap-1.5 text-xs text-base-content/40">
                  {p.subfamilia?.familia?.nombre && (
                    <>
                      <span>{p.subfamilia.familia.nombre}</span>
                      <span>›</span>
                    </>
                  )}
                  {p.subfamilia?.nombre && <span>{p.subfamilia.nombre}</span>}
                </div>

                {/* Nombre */}
                <h3 className="font-bold text-sm leading-tight group-hover:text-warning transition-colors">
                  {p.nombre}
                </h3>

                {/* Material + espesor + fabricante */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/60">
                  {p.material?.nombre && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> {p.material.nombre}
                    </span>
                  )}
                  {p.espesor && (
                    <span className="flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> {p.espesor} mm
                    </span>
                  )}
                  {p.fabricante?.nombre && (
                    <span className="text-base-content/40">{p.fabricante.nombre}</span>
                  )}
                </div>

                {/* Footer: precio + medidas count */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-base-200">
                  <span className="font-mono font-semibold text-sm">
                    {formatCurrency(p.precioUnitario)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`badge badge-sm ${p._count.estrellaMedidas > 0 ? 'badge-warning' : 'badge-ghost'}`}>
                      {p._count.estrellaMedidas} {p._count.estrellaMedidas === 1 ? 'medida' : 'medidas'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-base-content/30 group-hover:text-warning transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
