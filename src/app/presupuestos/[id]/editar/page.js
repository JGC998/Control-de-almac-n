
import { readData } from '@/utils/dataManager';
import CreatePresupuestoForm from '@/components/CreatePresupuestoForm';
import { notFound } from 'next/navigation';

export default async function EditarPresupuestoPage({ params }) {
  const { id } = params;

  // Leemos todos los datos necesarios en el servidor
  const clients = await readData('clientes.json');
  const products = await readData('productos.json');
  const quotes = await readData('presupuestos.json');
  const config = await readData('config.json');

  const quoteToEdit = quotes.find(q => q.id === id);

  if (!quoteToEdit) {
    notFound();
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-base-content">Editar Presupuesto</h1>
          <p className="text-base-content/70">Modifica los datos del presupuesto.</p>
        </div>
        
        <CreatePresupuestoForm 
          clients={clients} 
          products={products} 
          presupuestoToEdit={quoteToEdit} 
          ivaRate={config.iva_rate} 
        />
      </div>
    </main>
  );
}
