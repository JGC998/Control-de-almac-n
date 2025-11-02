import { readData } from '@/utils/dataManager';
import PricingManager from '@/components/PricingManager';

export default async function PricingSettingsPage() {
  // Cargar todos los datos de las reglas en el servidor
  const [margins, discounts, specialPrices] = await Promise.all([
    readData('margenes.json'),
    readData('descuentos.json'),
    readData('precios_especiales.json')
  ]);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base-content">Ajustes de Precios</h1>
        <p className="text-base-content/70">Gestiona las reglas que determinan los precios automáticos.</p>
      </div>
      <PricingManager 
        initialMargins={margins}
        initialDiscounts={discounts}
        initialSpecialPrices={specialPrices}
      />
    </main>
  );
}
