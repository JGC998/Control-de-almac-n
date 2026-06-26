"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Package, Receipt, AlertCircle, Clock,
  PlusCircle, Ship, Warehouse, Table2,
  Calculator, Ruler,
} from 'lucide-react';

const ACCESOS = [
  {
    label: 'Pedidos de cliente',
    href: '/pedidos',
    icon: Package,
    color: 'bg-primary text-primary-content',
  },
  {
    label: 'Nuevo pedido',
    href: '/pedidos/nuevo',
    icon: PlusCircle,
    color: 'bg-success text-success-content',
  },
  {
    label: 'Contenedores',
    href: '/compras/contenedores',
    icon: Ship,
    color: 'bg-secondary text-secondary-content',
  },
  {
    label: 'Almacén',
    href: '/almacen',
    icon: Warehouse,
    color: 'bg-accent text-accent-content',
  },
  {
    label: 'Tarifa de materiales',
    href: '/tarifas',
    icon: Table2,
    color: 'bg-info text-info-content',
  },
  {
    label: 'Calculadora bandas PVC',
    href: '/calculadora/bandas',
    icon: Calculator,
    color: 'bg-warning text-warning-content',
  },
  {
    label: 'Calculadora metrajes',
    href: '/calculadora/metrajes',
    icon: Ruler,
    color: 'bg-neutral text-neutral-content',
  },
];

function AccesosDirectos() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ACCESOS.map(({ label, href, icon: Icon, color }) => (
        <Link
          key={href}
          href={href}
          className={`${color} rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow hover:scale-105 active:scale-95 transition-transform text-center`}
        >
          <Icon className="w-8 h-8" strokeWidth={1.5} />
          <span className="text-sm font-semibold leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function PanelFacturasPendientes({ datos }) {
  if (!datos) return null;
  const { total, count, vencidas, lista } = datos;

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-warning" />
            Facturas pendientes de cobro
          </h2>
          <Link href="/facturas" className="text-xs text-primary hover:underline">Ver todas</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-base-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-base-content/50">facturas emitidas</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${vencidas > 0 ? 'bg-error/10' : 'bg-base-200'}`}>
            <p className={`text-2xl font-bold ${vencidas > 0 ? 'text-error' : ''}`}>{vencidas}</p>
            <p className="text-xs text-base-content/50">vencidas</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 pb-2 border-b border-base-200">
          <span className="text-sm text-base-content/60">Total pendiente</span>
          <span className="font-bold text-lg">
            {Number(total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-base-content/40 text-center py-4">Sin facturas pendientes</p>
        ) : (
          <div className="space-y-1">
            {lista.map(f => (
              <Link key={f.id} href={`/facturas/${f.id}`}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  {f.vencida
                    ? <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                    : <Clock className="w-3.5 h-3.5 text-base-content/30 shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold">{f.numero}</p>
                    <p className="text-xs text-base-content/50 truncate">{f.cliente}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={`text-sm font-semibold ${f.vencida ? 'text-error' : ''}`}>
                    {f.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                  {f.fechaVencimiento && (
                    <p className={`text-xs ${f.vencida ? 'text-error' : 'text-base-content/40'}`}>
                      {new Date(f.fechaVencimiento).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, error, isLoading } = useSWR('/api/dashboard', {
    refreshInterval: 60000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });

  if (isLoading || !data) return (
    <div className="flex justify-center items-center h-screen">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
  if (error) return (
    <div className="flex justify-center items-center h-screen">
      <div role="alert" className="alert alert-error max-w-md">
        <span>Error al cargar los datos del dashboard.</span>
      </div>
    </div>
  );

  const { facturasPendientes } = data;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-5">Inicio</h1>

      {/* Accesos directos — misma grid en escritorio y tablet/móvil */}
      <AccesosDirectos />

      {/* Panel facturas pendientes */}
      {facturasPendientes && (
        <div className="mt-6">
          <PanelFacturasPendientes datos={facturasPendientes} />
        </div>
      )}
    </div>
  );
}
