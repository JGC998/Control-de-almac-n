"use client";
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

// Este componente ahora espera 'stockData' como prop,
// que es un array de items de la tabla 'Stock'.
export default function NivelesStock({ stockData }) {
  
  // Añadimos una comprobación para evitar el crash si stockData es undefined
  if (!stockData || stockData.length === 0) {
    return (
      <div className="card bg-base-100 shadow-xl h-full">
        <div className="card-body">
          <h2 className="card-title text-accent">Niveles de Stock</h2>
          <p>No hay datos de stock disponibles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title text-accent">Niveles de Stock</h2>
        <div className="space-y-4 mt-4 overflow-y-auto max-h-96">
          {/* Usamos 'stockData' y 'slice' */}
          {stockData.slice(0, 5).map(item => {
            // Usamos los nuevos nombres de campo de la BD
            const currentStock = item.metrosDisponibles;
            // No tenemos 'stock_minimo' en la nueva BD,
            // así que inventamos uno (ej. 100m) solo para la demo visual
            const minStock = 100; 
            const percentage = (currentStock / minStock) * 100;
            
            let Icon = TrendingUp;
            let color = "text-success";
            if (percentage < 50) {
              Icon = TrendingDown;
              color = "text-error";
            } else if (percentage < 75) {
              Icon = Minus;
              color = "text-warning";
            }

            return (
              <div key={item.id} className="flex items-center gap-4">
                <Icon className={`w-6 h-6 ${color}`} />
                <div>
                  <div className="font-bold">{item.material} ({item.espesor}mm)</div>
                  <div className="text-sm opacity-50">{item.proveedor}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-bold">{currentStock.toFixed(2)}m</div>
                  <progress 
                    className={`progress ${color.replace('text-', 'progress-')} w-20`} 
                    value={percentage} 
                    max="100"
                  ></progress>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
