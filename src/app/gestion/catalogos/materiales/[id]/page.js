"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Layers, ArrowLeft, Package } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

export default function MaterialDetallePage() {
  const { id } = useParams();
  const { data: mat, isLoading, error } = useSWR(`/api/materiales/${id}`, fetcher);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );

  if (error || !mat) return (
    <div className="container mx-auto p-6">
      <div className="alert alert-error">Material no encontrado.</div>
      <Link href="/gestion/catalogos/materiales" className="btn btn-ghost mt-4 gap-2">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>
    </div>
  );

  const productos = mat.productos ?? [];
  const activos   = productos.filter(p => p.activo).length;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestion/catalogos/materiales" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft className="w-4 h-4" /> Materiales
        </Link>
        <Layers className="w-7 h-7 shrink-0 text-primary" />
        <h1 className="text-2xl font-bold">{mat.nombre}</h1>
      </div>

      {/* KPIs */}
      <div className="stats shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-figure text-primary"><Package className="w-7 h-7" /></div>
          <div className="stat-title">Productos totales</div>
          <div className="stat-value text-primary">{productos.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Activos</div>
          <div className="stat-value text-success">{activos}</div>
        </div>
        {activos < productos.length && (
          <div className="stat">
            <div className="stat-title">Inactivos</div>
            <div className="stat-value text-base-content/40">{productos.length - activos}</div>
          </div>
        )}
      </div>

      {/* Tabla de productos */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <div className="px-5 pt-4 pb-2">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> Productos con este material
            </h2>
          </div>
          {productos.length === 0 ? (
            <div className="px-5 pb-5 text-base-content/40 text-sm">
              No hay productos asociados a este material.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-base-content/50">
                    <th>Nombre</th>
                    <th>Ref. Fabricante</th>
                    <th>Fabricante</th>
                    <th>Familia</th>
                    <th>Tipo</th>
                    <th className="text-right">Espesor</th>
                    <th className="text-right">Ancho</th>
                    <th className="text-right">Largo</th>
                    <th className="text-right">Precio</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {productos.map(p => (
                    <tr key={p.id} className={`hover ${!p.activo ? 'opacity-50' : ''}`}>
                      <td className="font-medium max-w-[160px] truncate">{p.nombre}</td>
                      <td className="font-mono text-xs text-base-content/60">{p.referenciaFabricante || '—'}</td>
                      <td className="text-xs">{p.fabricante?.nombre || '—'}</td>
                      <td className="text-xs">
                        {p.subfamilia
                          ? `${p.subfamilia.familia?.nombre ?? ''} / ${p.subfamilia.nombre}`
                          : '—'}
                      </td>
                      <td><span className="badge badge-ghost badge-sm">{p.tipo}</span></td>
                      <td className="text-right font-mono text-xs">{p.espesor != null ? `${p.espesor} mm` : '—'}</td>
                      <td className="text-right font-mono text-xs">{p.ancho != null ? `${p.ancho} mm` : '—'}</td>
                      <td className="text-right font-mono text-xs">{p.largo != null ? `${p.largo} mm` : '—'}</td>
                      <td className="text-right font-mono font-semibold">{formatCurrency(p.precioUnitario)}</td>
                      <td>
                        <span className={`badge badge-sm ${p.activo ? 'badge-success' : 'badge-ghost opacity-50'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link href={`/gestion/productos/${p.id}`} className="btn btn-ghost btn-xs">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
