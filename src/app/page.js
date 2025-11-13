"use client";
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Package, FileText, Truck, Users, DollarSign, Activity } from 'lucide-react';

import NivelesStock from '@/components/NivelesStock';
import MovimientosRecientesTable from '@/components/MovimientosRecientesTable';
import KPICard from '@/components/KPICard';
// 👈 Importar el nuevo componente
import TablonNotas from '@/components/TablonNotas'; 

const fetcher = (url) => fetch(url).then((res) => res.json());

// Mapa de iconos para usar en KPICard (incluye todos los posibles)
const iconMap = {
    Package: Package,
    FileText: FileText,
    Truck: Truck,
    Users: Users,
    DollarSign: DollarSign,
    Activity: Activity,
};

export default function Dashboard() {
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    refreshInterval: 30000 
  });

  if (isLoading || !data) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) {
    console.error("Error al cargar datos del dashboard:", error);
    return <div className="text-center text-red-500">Error al cargar los datos del dashboard.</div>;
  }

  const { kpiData, nivelesStock, movimientosRecientes } = data;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Operaciones</h1>
      
      {/* Sección de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpiData.map((kpi, index) => {
          const IconComponent = iconMap[kpi.icon] || Activity;
          
          return (
            <Link key={index} href={kpi.href} className="block hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <KPICard 
                title={kpi.title} 
                value={kpi.value} 
                icon={<IconComponent className="w-6 h-6" />}
              />
            </Link>
          );
        })}
      </div>

      {/* Secciones de Almacén, Movimientos y Notas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Niveles de Stock y Notas (Columna 1) */}
        <div className="lg:col-span-1 space-y-6">

          {/* 👈 Nuevo componente de Notas apilado */}
          <TablonNotas /> 
        </div>
        
     
        
      </div>
    </div>
  );
}