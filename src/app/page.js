'use client';

import Link from "next/link";
import { FaBoxes, FaClipboardList, FaTruck, FaWrench, FaWarehouse, FaEuroSign } from "react-icons/fa";
import MovimientosRecientesTable from "@/components/MovimientosRecientesTable";
import TablonNotas from "@/components/TablonNotas";
import ResumenPedidosCliente from "@/components/ResumenPedidosCliente";
import { useDashboardData } from '../utils/useDashboardData'; // Importamos el nuevo hook

export default function Home() {
  // Toda la lógica de carga de datos ahora reside en el hook.
  const { data, loading, error } = useDashboardData();

  // Estado de carga
  if (loading) {
    return (
      <main className="p-8 bg-base-200 min-h-screen flex justify-center items-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    );
  }

  // Estado de error
  if (error) {
    return (
      <main className="p-8 bg-base-200 min-h-screen flex justify-center items-center">
        <div className="text-center text-error">
          <h2 className="text-2xl font-bold">Error al cargar los datos</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  // Una vez cargado, renderizamos la página con los datos del hook
  return (
    <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen w-full">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-primary flex items-center gap-3">
          <FaWarehouse /> Dashboard de Taller
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="stats shadow-lg stats-vertical lg:stats-horizontal">
              <Link href="/clientes" className="stat">
                <div className="stat-figure text-primary">
                  <FaClipboardList className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos de Clientes</div>
                <div className="stat-value text-primary">{data.stats.pedidosClientes}</div>
                <div className="stat-desc">Pendientes de fabricar</div>
              </Link>
              
              <Link href="/proveedores" className="stat">
                <div className="stat-figure text-accent">
                  <FaTruck className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos a Proveedores</div>
                <div className="stat-value text-accent">{data.stats.pedidosProveedores}</div>
                <div className="stat-desc">Pendientes de recibir</div>
              </Link>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent">Últimos Movimientos de Almacén</h2>
                <MovimientosRecientesTable movimientos={data.movimientos} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <TablonNotas />
            <ResumenPedidosCliente pedidos={data.pedidos} />
          </div>
        </div>
      </div>
    </main>
  );
}
