"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Star, Layers, Ruler, ChevronRight } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

export default function EstrellasPage() {
  const { data: productos, isLoading, error } = useSWR('/api/estrellas', fetcher);

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

      {!isLoading && !error && productos?.length === 0 && (
        <div className="text-center py-16 text-base-content/40">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No se encontraron productos con "Estrella" en el nombre o subfamilia.</p>
        </div>
      )}

      {!isLoading && !error && productos && productos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map(p => (
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

                {/* Material + espesor */}
                <div className="flex items-center gap-3 text-xs text-base-content/60">
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
