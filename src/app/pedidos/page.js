import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, PlusCircle, Download, Ban, Printer } from 'lucide-react';
import { db } from '@/lib/db';
import TablaConSeleccion from '@/componentes/compuestos/TablaConSeleccion';
import { PaginacionServidor, FiltroEstado } from '@/componentes/ui';
import FiltroBusqueda from '@/componentes/ui/FiltroBusqueda';
import FiltroFechas from '@/componentes/ui/FiltroFechas';

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

export default async function PedidosPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;

  const tab     = searchParams?.tab || 'facturable';
  const page    = parseInt(searchParams?.page  || '1');
  const limit   = parseInt(searchParams?.limit || '20');
  const skip    = (page - 1) * limit;
  const busqueda = searchParams?.busqueda;
  const desde   = searchParams?.desde;
  const hasta   = searchParams?.hasta;

  // 'todos' = sin filtro; sin parámetro = redirigir a Pendiente por defecto
  if (!searchParams?.estado) redirect('/pedidos?estado=Pendiente');
  const estado = searchParams.estado === 'todos' ? null : searchParams.estado;

  const esInterno = tab === 'interno';

  const where = { sinFacturacion: esInterno };
  if (estado) where.estado = estado;
  if (busqueda) {
    where.OR = [
      { numero: { contains: busqueda } },
      { cliente: { nombre: { contains: busqueda } } },
    ];
  }
  if (desde || hasta) {
    where.fechaCreacion = {};
    if (desde) where.fechaCreacion.gte = new Date(desde);
    if (hasta) {
      const h = new Date(hasta);
      h.setHours(23, 59, 59, 999);
      where.fechaCreacion.lte = h;
    }
  }

  const [pedidos, total, totalFacturables, totalInternos, margenes, ivaConfig] = await Promise.all([
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
    db.reglaMargen.findMany(),
    db.config.findUnique({ where: { key: 'iva_rate' } }),
  ]);

  const ivaRate = ivaConfig?.value ? parseFloat(ivaConfig.value) / 100 : 0.21;
  const pedidosConTotal = pedidos.map(p => {
    if (!p.marginId) return p;
    const margen = margenes.find(m => m.id === p.marginId);
    if (!margen) return p;
    const multiplicador = Number(margen.multiplicador) || 1;
    const gastoFijo = Number(margen.gastoFijo) || 0;
    const subtotalVenta = p.subtotal * multiplicador + gastoFijo;
    return { ...p, total: parseFloat((subtotalVenta * (1 + ivaRate)).toFixed(2)) };
  });

  const meta = { total, page, limit, totalPages: Math.ceil(total / limit) };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Pedidos
        </h1>
        <div className="flex gap-2 items-center">
          <Link href="/pedidos/notas-taller" className="btn btn-outline gap-2">
            <Printer className="w-4 h-4" /> Imprimir notas
          </Link>
          <a href="/api/pedidos/export" target="_blank" className="btn btn-outline btn-success gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </a>
          <Link href="/pedidos/nuevo" className="btn btn-primary">
            <PlusCircle className="w-4 h-4" /> Nuevo Pedido
          </Link>
        </div>
      </div>

      {/*
        OCULTO — Tabs Facturables / Internos
        Descomenta cuando se quiera separar pedidos facturables de pedidos internos (sin facturación).
        Requiere también descomentar el bloque de alerta de "esInterno" justo debajo.
        El filtro funciona por ?tab=interno en la URL; el conteo viene de totalFacturables y totalInternos.

        <div className="flex gap-2 mb-4">
          <Link href="/pedidos" className={`btn btn-sm gap-1 ${!esInterno ? 'btn-neutral' : 'btn-ghost'}`}>
            <Package className="w-3 h-3" /> Facturables
            <span className="badge badge-sm">{totalFacturables}</span>
          </Link>
          <Link href="/pedidos?tab=interno" className={`btn btn-sm gap-1 ${esInterno ? 'btn-neutral' : 'btn-ghost'}`}>
            <Ban className="w-3 h-3" /> Internos / No facturables
            {totalInternos > 0 && <span className="badge badge-sm badge-warning">{totalInternos}</span>}
          </Link>
        </div>
      */}

      {esInterno && (
        <div className="alert alert-warning mb-4 py-2 text-sm">
          <Ban className="w-4 h-4" />
          Estos pedidos están marcados como internos y no generarán albarán ni factura. No entran en la secuencia de AEAT.
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <FiltroBusqueda placeholder="Buscar por cliente o número..." />
        </div>
        <FiltroFechas />
        <FiltroEstado />
      </div>

      {/* Tabla */}
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <TablaConSeleccion
            tipo="pedido"
            datos={pedidosConTotal}
            columnas={columnasPedido}
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
