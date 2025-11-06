import PricingManager from '@/components/PricingManager';
import { DollarSign } from 'lucide-react';

export default function PreciosPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base-content flex items-center">
          <DollarSign className="mr-2" />
          Ajustes de Precios
        </h1>
        <p className="text-base-content/70">Gestiona las reglas que determinan los precios automáticos.</p>
      </div>
      {/* Este componente ahora cargará los datos por sí mismo usando SWR */}
      <PricingManager />
    </main>
  );
}
