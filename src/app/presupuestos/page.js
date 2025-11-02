
import Link from 'next/link';
import { readData } from '@/utils/dataManager';

// Funciones para formatear los datos en la tabla
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-ES');
const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);

async function PresupuestosPage() {
  // En Server Components, podemos leer los datos directamente
  const quotes = await readData('presupuestos.json');
  const clients = await readData('clientes.json');
  
  // Creamos un mapa para buscar nombres de clientes de forma eficiente
  const clientsMap = new Map(clients.map(c => [c.id, c.nombre]));

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-base-content">Presupuestos</h1>
        <Link href="/presupuestos/nuevo" className="btn btn-primary">
          Crear Nuevo Presupuesto
        </Link>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes && quotes.length > 0 ? (
              quotes.map(quote => (
                <tr key={quote.id} className="hover">
                  <td className="font-medium">{quote.numero}</td>
                  <td>{clientsMap.get(quote.clienteId) || 'Cliente no encontrado'}</td>
                  <td>{formatDate(quote.fechaCreacion)}</td>
                  <td>
                    <span className="badge badge-neutral-content badge-sm">{quote.estado}</span>
                  </td>
                  <td className="text-right">{formatCurrency(quote.total)}</td>
                  <td className="text-center space-x-2">
                    <Link href={`/presupuestos/${quote.id}`} className="btn btn-xs btn-outline">
                      Ver / Editar
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-10 text-base-content/60">
                  No se han encontrado presupuestos.
                  <br />
                  <Link href="/presupuestos/nuevo" className="link link-primary mt-2">Crea el primero</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default PresupuestosPage;
