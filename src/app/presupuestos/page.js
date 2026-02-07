import React from 'react';
import Link from 'next/link';
import { PlusCircle, FileText, CheckCircle, Clock, Download } from 'lucide-react';
import { db } from '@/lib/db';
import TablaDatos from '@/componentes/compuestos/TablaDatos';

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

export default async function PresupuestosPage() {
  // Obtener todos los presupuestos ordenados por fecha
  const allPresupuestos = await db.presupuesto.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    orderBy: { fechaCreacion: 'desc' },
  });

  // Dividir por estado
  const presupuestosAceptados = allPresupuestos.filter(p => p.estado === 'Aceptado');
  const presupuestosBorrador = allPresupuestos.filter(p => p.estado === 'Borrador');

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

      {/* Tablas de presupuestos */}
      <div className="space-y-4">
        <TablaDatos
          datos={presupuestosAceptados}
          columnas={columnasPresupuesto}
          titulo="Aceptados"
          icono={CheckCircle}
          rutaBase="/presupuestos"
          colapsable
          colapsadoInicial={false}
        />

        <TablaDatos
          datos={presupuestosBorrador}
          columnas={columnasPresupuesto}
          titulo="Borradores"
          icono={Clock}
          rutaBase="/presupuestos"
          colapsable
          colapsadoInicial={false}
        />
      </div>
    </div>
  );
}
