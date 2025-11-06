"use client";
import { Package, AlertTriangle, CheckCircle, TrendingDown, Minus } from 'lucide-react';

export default function NivelesStock({ data }) {
  
  if (!data || data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl h-full">
        <div className="card-body p-6">
          <h2 className="card-title text-xl flex items-center mb-4">
            <Package className="w-6 h-6 mr-2 text-primary" /> Niveles de Stock Críticos
          </h2>
          <div className="text-center py-10">
            <CheckCircle className="w-10 h-10 mx-auto text-success" />
            <p className="mt-2 text-lg text-success font-semibold">Stock Suficiente</p>
            <p className="text-sm text-gray-500 mt-1">No hay materiales por debajo del mínimo.</p>
          </div>
        </div>
      </div>
    );
  }

  // Ordenar por el porcentaje más bajo
  const sortedStock = [...data].sort((a, b) => {
    const aMin = a.stockMinimo || 0;
    const bMin = b.stockMinimo || 0;
    const aPerc = aMin > 0 ? a.metrosDisponibles / aMin : (a.metrosDisponibles > 0 ? 1 : 0);
    const bPerc = bMin > 0 ? b.metrosDisponibles / bMin : (b.metrosDisponibles > 0 ? 1 : 0);
    return aPerc - bPerc;
  });

  const getItemStatus = (stock, minStock) => {
    const percentage = minStock > 0 ? (stock / minStock) * 100 : 100;
    if (percentage <= 25) {
      return { icon: TrendingDown, color: "text-error", progress: "progress-error" };
    }
    if (percentage <= 75) {
      return { icon: Minus, color: "text-warning", progress: "progress-warning" };
    }
    return { icon: CheckCircle, color: "text-success", progress: "progress-success" };
  };

  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body p-6">
        <h2 className="card-title text-xl flex items-center mb-4">
          <Package className="w-6 h-6 mr-2 text-primary" /> Niveles de Stock Críticos
        </h2>
        
        <p className="text-sm text-gray-500 mb-4">
          Materiales por debajo del nivel mínimo establecido.
        </p>

        <ul className="space-y-4">
          {sortedStock.map((item) => {
            const status = getItemStatus(item.metrosDisponibles, item.stockMinimo);
            const percentage = item.stockMinimo > 0 ? (item.metrosDisponibles / item.stockMinimo) * 100 : (item.metrosDisponibles > 0 ? 100 : 0);

            return (
              <li key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {React.createElement(status.icon, { className: `w-5 h-5 ${status.color} mr-2` })}
                    <span className="font-medium">{item.material}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{item.metrosDisponibles.toFixed(2)}m</span>
                    <p className="text-xs text-gray-500">Min: {item.stockMinimo.toFixed(2)}m</p>
                  </div>
                </div>
                <progress 
                  className={`progress ${status.progress} w-full`} 
                  value={Math.min(percentage, 100)} // Limitar visualmente al 100%
                  max="100"
                ></progress>
              </li>
            );
          })}
        </ul>
        <div className="card-actions justify-end mt-4">
            <a href="/almacen" className="btn btn-sm btn-outline">Ir a Almacén</a>
        </div>
      </div>
    </div>
  );
}
