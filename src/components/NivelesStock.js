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

  // --- ORDENAMOS: Los más bajos primero ---
  const sortedStock = [...stockData].sort((a, b) => {
    const aMin = a.stockMinimo || 100;
    const bMin = b.stockMinimo || 100;
    const aPerc = aMin > 0 ? a.metrosDisponibles / aMin : Infinity;
    const bPerc = bMin > 0 ? b.metrosDisponibles / bMin : Infinity;
    return aPerc - bPerc;
  });


  return (
    <div className="card bg-base-100 shadow-xl h-full">
      <div className="card-body">
        <h2 className="card-title text-accent">Niveles de Stock</h2>
        <div className="space-y-4 mt-4 overflow-y-auto max-h-96">
          {/* Usamos 'sortedStock' y 'slice' */}
          {sortedStock.slice(0, 5).map(item => {
            // Usamos los nuevos nombres de campo de la BD
            const currentStock = item.metrosDisponibles;
            
            // --- LÓGICA MEJORADA ---
            // Usamos el stockMinimo de la BD, o 100 como fallback visual si no está definido
            const minStock = item.stockMinimo || 100; 
            // Prevenimos división por cero
            const percentage = minStock > 0 ? (currentStock / minStock) * 100 : (currentStock > 0 ? 100 : 0);
            
            let Icon = TrendingUp;
            let color = "text-success";
            // Ajustamos los umbrales
            if (percentage < 80) {
              Icon = TrendingDown;
              color = "text-error";
            } else if (percentage < 100) {
              Icon = Minus;
              color = "text-warning";
            }
            // --- FIN LÓGICA MEJORADA ---

            return (
              <div key={item.id} className="flex items-center gap-4">
                <Icon className={`w-6 h-6 ${color}`} />
                <div>
                  <div className="font-bold">{item.material} ({item.espesor}mm)</div>
                  <div className="text-sm opacity-50">{item.proveedor}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-bold">{currentStock.toFixed(2)}m</div>
                  {/* Mostramos el mínimo */}
                  <div className="text-xs opacity-50">Min: {minStock}m</div> 
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
