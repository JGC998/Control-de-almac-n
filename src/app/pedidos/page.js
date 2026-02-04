import React from 'react';
import Link from 'next/link';
import { Package, PlusCircle, CheckCircle, Clock } from 'lucide-react';
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

export default async function PedidosPage() {
  // Obtener todos los pedidos ordenados por fecha
  const allPedidos = await db.pedido.findMany({
    include: {
      cliente: {
        select: { nombre: true },
      },
    },
    orderBy: { fechaCreacion: 'desc' },
  });

  // Dividir en Activos e Históricos
  const pedidosActivos = allPedidos.filter(p =>
    p.estado !== 'Completado' && p.estado !== 'Cancelado'
  );
  const pedidosHistoricos = allPedidos.filter(p =>
    p.estado === 'Completado' || p.estado === 'Cancelado'
  );

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Pedidos
        </h1>
        <Link href="/pedidos/nuevo" className="btn btn-primary">
          <PlusCircle className="w-4 h-4" /> Nuevo Pedido
        </Link>
      </div>

      {/* Tablas de pedidos */}
      <div className="space-y-6">
        <TablaDatos
          datos={pedidosActivos}
          columnas={columnasPedido}
          titulo="Pedidos Activos"
          icono={Clock}
          rutaBase="/pedidos"
          mensajeVacio="No hay pedidos activos actualmente."
        />

        <TablaDatos
          datos={pedidosHistoricos}
          columnas={columnasPedido}
          titulo="Pedidos Históricos"
          icono={CheckCircle}
          rutaBase="/pedidos"
          colapsable
          colapsadoInicial={true}
        />
      </div>
    </div>
  );
}