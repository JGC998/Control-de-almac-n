import React from 'react';
import Link from 'next/link';
import { Package, PlusCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { db } from '@/lib/db';
import TablaDatos from '@/componentes/compuestos/TablaDatos';

// Definición de columnas para la tabla de pedidos
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
      'Completado': 'exito',
      'Enviado': 'info',
      'Pendiente': 'advertencia',
      'Cancelado': 'error',
    }
  },
];

export const dynamic = 'force-dynamic';
import { PaginacionServidor, FiltroEstado } from '@/componentes/ui';

export default async function PedidosPage({ searchParams: searchParamsPromise }) {
  // Await searchParams before accessing properties
  const searchParams = await searchParamsPromise;

  const page = parseInt(searchParams?.page || '1');
  const limit = parseInt(searchParams?.limit || '20');
  const skip = (page - 1) * limit;
  const estado = searchParams?.estado;

  // Construir filtro
  const where = {};
  if (estado) {
    where.estado = estado;
  }

  // Obtener pedidos paginados
  const [pedidos, total] = await Promise.all([
    db.pedido.findMany({
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
    db.pedido.count({ where }),
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

      {/* Tabla Unificada con Paginación */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <TablaDatos
            datos={pedidos}
            columnas={columnasPedido}
            rutaBase="/pedidos"
            mensajeVacio="No hay pedidos registrados."
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