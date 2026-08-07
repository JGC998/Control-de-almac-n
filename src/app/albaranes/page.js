import Link from 'next/link';
import { FileCheck, PlusCircle } from 'lucide-react';
import { db } from '@/lib/db';
import TablaConSeleccion from '@/componentes/compuestos/TablaConSeleccion';
import { PaginacionServidor } from '@/componentes/ui';
import FiltroBusqueda from '@/componentes/ui/FiltroBusqueda';

const columnas = [
  { clave: 'numero',        etiqueta: 'Número' },
  { clave: 'cliente.nombre', etiqueta: 'Cliente' },
  { clave: 'fechaCreacion', etiqueta: 'Fecha', formato: 'fecha' },
  {
    clave: 'estado',
    etiqueta: 'Estado',
    formato: 'insignia',
    insigniaConfig: {
      Pendiente:  'advertencia',
      Entregado:  'exito',
      Cancelado:  'error',
    },
  },
];

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Albaranes — CRM Taller' };

export default async function AlbaranesPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const page     = Math.max(1, parseInt(searchParams?.page  || '1',  10));
  const limit    = Math.min(100, parseInt(searchParams?.limit || '20', 10));
  const skip     = (page - 1) * limit;
  const busqueda = searchParams?.busqueda;

  const where = {};
  if (busqueda) {
    where.OR = [
      { numero:  { contains: busqueda } },
      { cliente: { nombre: { contains: busqueda } } },
    ];
  }

  const [albaranes, total] = await Promise.all([
    db.albaran.findMany({
      where,
      skip,
      take: limit,
      include: { cliente: { select: { nombre: true } } },
      orderBy: { fechaCreacion: 'desc' },
    }),
    db.albaran.count({ where }),
  ]);

  const meta = { total, page, limit, totalPages: Math.ceil(total / limit) };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileCheck className="w-8 h-8" /> Albaranes
        </h1>
        <Link href="/albaranes/nuevo" className="btn btn-primary gap-2">
          <PlusCircle className="w-4 h-4" /> Nuevo albarán
        </Link>
      </div>

      <div className="mb-4">
        <FiltroBusqueda placeholder="Buscar por cliente o número..." />
      </div>

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-0">
          <TablaConSeleccion
            tipo="albaran"
            datos={albaranes}
            columnas={columnas}
            rutaBase="/albaranes"
            mensajeVacio="No hay albaranes registrados."
          />
        </div>
      </div>

      <div className="mt-4">
        <PaginacionServidor meta={meta} />
      </div>
    </div>
  );
}
