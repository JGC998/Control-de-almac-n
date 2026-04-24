import React from 'react';
import Link from 'next/link';
import { FileText, PlusCircle, Download } from 'lucide-react';
import { db } from '@/lib/db';
import TablaDatos from '@/componentes/compuestos/TablaDatos';
import { PaginacionServidor } from '@/componentes/ui';
import FiltroEstadoPresupuesto from '@/componentes/ui/FiltroEstadoPresupuesto';
import FiltroBusqueda from '@/componentes/ui/FiltroBusqueda';

// Definición de columnas para la tabla de presupuestos
const columnasPresupuesto = [
  { clave: 'numero', etiqueta: 'Número' },
  { clave: 'cliente.nombre', etiqueta: 'Cliente' },
  { clave: 'fechaCreacion', etiqueta: 'Fecha', formato: 'fecha' },
  { clave: 'total', etiqueta: 'Total', formato: 'moneda' },
  {
    clave: 'estado',
    etiqueta: 'Estado',
    formato: 'insignia',
    insigniaConfig: {
      'Aceptado': 'info',
      'Borrador': 'advertencia',
      'Rechazado': 'error',
    }
  },
];

export const dynamic = 'force-dynamic';

export default async function PresupuestosPage({ searchParams: searchParamsPromise }) {
  // Await searchParams before accessing properties
  const searchParams = await searchParamsPromise;

  const page = parseInt(searchParams?.page || '1');
  const limit = parseInt(searchParams?.limit || '20');
  const skip = (page - 1) * limit;
  const estado = searchParams?.estado;
  const busqueda = searchParams?.busqueda;

  // Construir filtro
  const where = {};

  if (estado) {
    where.estado = estado;
  }

  if (busqueda) {
    where.OR = [
      { numero: { contains: busqueda, mode: 'insensitive' } },
      { cliente: { nombre: { contains: busqueda, mode: 'insensitive' } } },
    ];
  }

  // Obtener presupuestos paginados
  const [presupuestos, total] = await Promise.all([
    db.presupuesto.findMany({
      where,
      skip,
      take: limit,
      include: {
        cliente: {
          select: { nombre: true },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
    db.presupuesto.count({ where }),
  ]);

  const meta = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8" /> Presupuestos
        </h1>
        <div className="flex gap-2">
          <a href="/api/presupuestos/export" target="_blank" className="btn btn-outline btn-success gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </a>
          <Link href="/presupuestos/nuevo" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Presupuesto
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <FiltroBusqueda placeholder="Buscar por cliente o número..." />
        </div>
        <div className="w-full sm:w-auto">
          <FiltroEstadoPresupuesto />
        </div>
      </div>

      {/* Tabla unificada */}
      <TablaDatos
        datos={presupuestos}
        columnas={columnasPresupuesto}
        titulo={`Presupuestos (${total})`}
        icono={FileText}
        rutaBase="/presupuestos"
        colapsable={false}
      />

      {/* Paginación */}
      <div className="mt-4">
        <PaginacionServidor meta={meta} />
      </div>
    </div>
  );
}
