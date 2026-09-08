"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { Tag, ArrowLeft, Package, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/utilidades';

export default function FamiliaDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: familia, isLoading } = useSWR(id ? `/api/familias/${id}` : null);
  const [subfiltro, setSubfiltro] = useState('todas');

  if (isLoading) return <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg" /></div>;
  if (!familia)  return <div className="text-center py-20 text-error">Familia no encontrada.</div>;

  const productos = (familia.subfamilias ?? []).flatMap(s =>
    (s.productos ?? []).map(p => ({ ...p, subfamiliaNombre: s.nombre }))
  );

  const activos   = productos.filter(p => p.activo);
  const inactivos = productos.filter(p => !p.activo);
  const visibles  = subfiltro === 'activos' ? activos : subfiltro === 'inactivos' ? inactivos : productos;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="flex items-center gap-3 mb-6">
        {familia.color && <span className="w-5 h-5 rounded-full inline-block" style={{ backgroundColor: familia.color }} />}
        <Tag className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{familia.nombre}</h1>
          {familia.descripcion && <p className="text-sm text-base-content/60">{familia.descripcion}</p>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Subfamilias',     value: familia.subfamilias?.length ?? 0, icon: Tag },
          { label: 'Total productos', value: productos.length,                  icon: Package },
          { label: 'Activos',         value: activos.length,                   icon: CheckCircle },
          { label: 'Inactivos',       value: inactivos.length,                 icon: XCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-base-200 rounded-xl p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-primary shrink-0" />
            <div>
              <div className="text-xs text-base-content/50">{label}</div>
              <div className="text-xl font-bold">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Subfamilias resumen */}
      {familia.subfamilias?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {familia.subfamilias.map(s => (
            <span key={s.id} className="badge badge-outline gap-1">
              <Tag className="w-3 h-3" />
              {s.nombre}
              <span className="font-mono text-xs ml-1">{s.productos?.length ?? 0}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filtro y tabla de productos */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
            <h2 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Productos</h2>
            <div className="tabs tabs-boxed tabs-sm">
              {[['todas','Todos'],['activos','Activos'],['inactivos','Inactivos']].map(([v,l]) => (
                <button key={v} className={`tab ${subfiltro === v ? 'tab-active' : ''}`} onClick={() => setSubfiltro(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs uppercase text-base-content/50">
                  <th>Nombre</th>
                  <th>Subfamilia</th>
                  <th className="hidden sm:table-cell">Tipo</th>
                  <th className="hidden md:table-cell">Fabricante</th>
                  <th className="hidden md:table-cell text-right">Espesor</th>
                  <th className="hidden lg:table-cell text-right">Ancho</th>
                  <th className="text-right">Precio</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-base-content/30">Sin productos en esta categoría</td></tr>
                )}
                {visibles.map(p => (
                  <tr key={p.id} className="hover">
                    <td className="font-medium max-w-xs">
                      <Link href={`/gestion/productos/${p.id}`} className="hover:text-primary hover:underline">
                        {p.nombre}
                      </Link>
                    </td>
                    <td className="text-sm text-base-content/60">{p.subfamiliaNombre}</td>
                    <td className="hidden sm:table-cell text-xs">
                      <span className="badge badge-ghost badge-sm">{p.tipo ?? '—'}</span>
                    </td>
                    <td className="hidden md:table-cell text-sm">{p.fabricante?.nombre ?? <span className="text-base-content/30">—</span>}</td>
                    <td className="hidden md:table-cell text-right text-sm font-mono">{p.espesor != null ? `${p.espesor}mm` : <span className="text-base-content/30">—</span>}</td>
                    <td className="hidden lg:table-cell text-right text-sm font-mono">{p.ancho != null ? `${p.ancho}mm` : <span className="text-base-content/30">—</span>}</td>
                    <td className="text-right font-mono text-sm font-semibold text-primary">
                      {p.precioUnitario != null ? formatCurrency(p.precioUnitario) : <span className="text-base-content/30">—</span>}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${p.activo ? 'badge-success' : 'badge-ghost'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/gestion/productos/${p.id}`} className="btn btn-xs btn-ghost">Ver →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
