"use client";
// import { useSession } from "next-auth/react"; // Eliminado temporalmente para la migración
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from 'swr'; // Importamos SWR
import KPICard from "@/components/KPICard";
import MovimientosRecientesTable from "@/components/MovimientosRecientesTable";
import NivelesStock from "@/components/NivelesStock";
import SalesChart from "@/components/SalesChart";
import TablonNotas from "@/components/TablonNotas";
import ResumenPedidosCliente from "@/components/ResumenPedidosCliente";
import { Package, Truck, User, FileText } from 'lucide-react';

// Definimos el 'fetcher' que usará SWR para obtener los datos
const fetcher = (url) => fetch(url).then((res) => res.json());

export default function Dashboard() {
  // const { data: session, status } = useSession();
  const router = useRouter();

  // Usamos SWR para llamar a la nueva API del dashboard
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 30000 // Opcional: refresca los datos cada 30 segundos
  });

  // Mantenemos el estado de carga y error
   if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (error) {
    console.error("Error al cargar datos del dashboard:", error);
    return <div className="text-center text-red-500">Error al cargar los datos del dashboard.</div>;
  }

  // Si data no existe, mostramos carga (SWR puede estar validando)
  if (!data) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  // La estructura de 'data' es la misma que antes (kpis, movimientosRecientes, etc.)
  const { kpis, movimientosRecientes, nivelesStock } = data;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Sección de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard 
          title="Total Pedidos" 
          value={kpis.totalPedidos} 
          icon={<Package className="w-6 h-6" />} 
          color="bg-blue-500" 
        />
        <KPICard 
          title="Total Presupuestos" 
          value={kpis.totalPresupuestos} 
          icon={<FileText className="w-6 h-6" />} 
          color="bg-green-500" 
        />
        <KPICard 
          title="Total Clientes" 
          value={kpis.totalClientes} 
          icon={<User className="w-6 h-6" />} 
          color="bg-yellow-500" 
        />
        <KPICard 
          title="Ingresos Totales" 
          value={`${kpis.totalIngresos.toFixed(2)} €`}
          icon={<Truck className="w-6 h-6" />} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gráfico de Ventas y Tablón de Notas */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">Ventas Recientes</h2>
              {/* <SalesChart salesData={data.ventasPorMes} /> */}
              <p>(Gráfico de ventas deshabilitado temporalmente en la migración)</p>
            </div>
          </div>
          <TablonNotas />
        </div>

        {/* Niveles de Stock */}
        <div className="lg:col-span-1">
          {/* LA CORRECCIÓN: Pasamos 'nivelesStock' (de la API) a la prop 'stockData' (que espera el componente) */}
          <NivelesStock stockData={nivelesStock} />
        </div>
      </div>

      {/* Movimientos Recientes y Resumen de Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MovimientosRecientesTable movimientos={movimientosRecientes} />
        </div>
        <div className="lg:col-span-1">
          {/* <ResumenPedidosCliente pedidos={data.resumenPedidos} /> */}
          <p>(Resumen de pedidos deshabilitado temporalmente en la migración)</p>
        </div>
      </div>
    </div>
  );
}
