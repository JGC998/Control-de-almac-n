import React from 'react';
import Link from 'next/link';
import { Package, PlusCircle, Download, Ban } from 'lucide-react';
import { db } from '@/lib/db';
import TablaDatos from '@/componentes/compuestos/TablaDatos';
import { PaginacionServidor, FiltroEstado } from '@/componentes/ui';

export const dynamic = 'force-dynamic';

const columnasPedido = [
  { clave: 'numero', etiqueta: 'Número' },
  { clave: 'cliente.nombre', etiqueta: 'Cliente' },
  { clave: 'fechaCreacion', etiqueta: 'Fecha', formato: 'fecha' },
  { clave: 'total', etiqueta: 'Total', formato: 'moneda' },
  {
    clave: 'estado',
    etiqueta: 'Estado',
    formato: 'insignia',
    insigniaConfig: {
      'Facturado': 'exito',
      'Pendiente': 'advertencia',
      'Cancelado': 'error',
    }
  },
];

const columnasInterno = [
  { clave: 'numero', etiqueta: 'Número' },
  { clave: 'cliente.nombre', etiqueta: 'Cliente' },
  { clave: 'fechaCreacion', etiqueta: 'Fecha', formato: 'fecha' },
  { clave: 'total', etiqueta: 'Total', formato: 'moneda' },
  {
    clave: 'estado',
    etiqueta: 'Estado',
    formato: 'insignia',
    insigniaConfig: {
      'Facturado': 'exito',
      'Pendiente': 'advertencia',
      'Cancelado': 'error',
    }
  },
];

export default async function PedidosPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;

  const tab = searchParams?.tab || 'facturable';
  const page = parseInt(searchParams?.page || '1');
  const limit = parseInt(searchParams?.limit || '20');
  const skip = (page - 1) * limit;
  const estado = searchParams?.estado;

  const esInterno = tab === 'interno';

  const where = { sinFacturacion: esInterno };
  if (estado) where.estado = estado;

  const [pedidos, total, totalFacturables, totalInternos] = await Promise.all([
    db.pedido.findMany({
      where,
      skip,
      take: limit,
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCreacion: 'desc' },
    }),
    db.pedido.count({ where }),
    db.pedido.count({ where: { sinFacturacion: false } }),
    db.pedido.count({ where: { sinFacturacion: true } }),
  ]);

  const meta = { total, page, limit, totalPages: Math.ceil(total / limit) };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Pedidos
        </h1>
        <div className="flex gap-2 items-center">
          <FiltroEstado />
          <a href="/api/pedidos/export" target="_blank" className="btn btn-outline btn-success gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </a>
          <Link href="/pedidos/nuevo" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Link
          href="/pedidos"
          className={`btn btn-sm gap-1 ${!esInterno ? 'btn-neutral' : 'btn-ghost'}`}>
          <Package className="w-3 h-3" /> Facturables
          <span className="badge badge-sm">{totalFacturables}</span>
        </Link>
        <Link
          href="/pedidos?tab=interno"
          className={`btn btn-sm gap-1 ${esInterno ? 'btn-neutral' : 'btn-ghost'}`}>
          <Ban className="w-3 h-3" /> Internos / No facturables
          {totalInternos > 0 && <span className="badge badge-sm badge-warning">{totalInternos}</span>}
        </Link>
      </div>

      {esInterno && (
        <div className="alert alert-warning mb-4 py-2 text-sm">
          <Ban className="w-4 h-4" />
          Estos pedidos están marcados como internos y no generarán albarán ni factura. No entran en la secuencia de AEAT.
        </div>
      )}

      {/* Tabla */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <TablaDatos
            datos={pedidos}
            columnas={esInterno ? columnasInterno : columnasPedido}
            rutaBase="/pedidos"
            mensajeVacio={esInterno ? 'No hay pedidos internos.' : 'No hay pedidos registrados.'}
          />
        </div>
      </div>

      {/* Paginación */}
      <div className="mt-4">
        <PaginacionServidor meta={meta} />
      </div>
    </div>
  );
}