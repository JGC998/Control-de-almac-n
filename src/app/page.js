'use client';

import Link from "next/link";
import { FaBoxes, FaClipboardList, FaTruck, FaWrench, FaWarehouse, FaEuroSign } from "react-icons/fa";
import MovimientosRecientesTable from "@/components/MovimientosRecientesTable";
import NivelesStock from "@/components/NivelesStock";
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
    <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-primary flex items-center gap-3">
          <FaWarehouse /> Dashboard de Taller
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="stats shadow-lg stats-vertical lg:stats-horizontal">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <FaClipboardList className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos de Clientes</div>
                <div className="stat-value text-primary">{data.stats.pedidosClientes}</div>
                <div className="stat-desc">Pendientes de fabricar</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <FaBoxes className="text-3xl" />
                </div>
                <div className="stat-title">Items con Stock Bajo</div>
                <div className="stat-value text-warning">{data.stats.stockBajo}</div>
                <div className="stat-desc">Necesitan reposición</div>
              </div>
              
              <div className="stat">
                <div className="stat-figure text-accent">
                  <FaTruck className="text-3xl" />
                </div>
                <div className="stat-title">Pedidos a Proveedores</div>
                <div className="stat-value text-accent">{data.stats.pedidosProveedores}</div>
                <div className="stat-desc">Pendientes de recibir</div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent">Últimos Movimientos de Almacén</h2>
                <MovimientosRecientesTable movimientos={data.movimientos} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <NivelesStock stockItems={data.stock} />

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-accent">Navegación Rápida</h2>
                <Link href="/clientes" className="btn btn-outline btn-secondary w-full mt-2"><FaClipboardList /> Pedidos Clientes</Link>
                <Link href="/proveedores" className="btn btn-outline btn-secondary w-full mt-2"><FaTruck /> Pedidos Proveedores</Link>
                <Link href="/calculadora" className="btn btn-outline btn-primary w-full mt-2"><FaWrench /> Calculadora</Link>
                <Link href="/tarifas" className="btn btn-outline btn-info w-full mt-2"><FaEuroSign /> Consultar Tarifas</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

