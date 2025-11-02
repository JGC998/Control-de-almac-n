
import { readData } from '@/utils/dataManager';
import CreatePresupuestoForm from '@/components/CreatePresupuestoForm';

export default async function NuevoPresupuestoPage() {
  // Leemos los datos necesarios en el servidor
  const clients = await readData('clientes.json');
  const products = await readData('productos.json');
  const config = await readData('config.json');

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-base-content">Crear Nuevo Presupuesto</h1>
          <p className="text-base-content/70">Rellena los datos para generar un nuevo presupuesto.</p>
        </div>
        
        {/* 
          Pasamos los datos leídos en el servidor (clientes, productos) 
          al componente de cliente que manejará la interactividad del formulario.
        */}
        <CreatePresupuestoForm clients={clients} products={products} ivaRate={config.iva_rate} />
      </div>
    </main>
  );
}
