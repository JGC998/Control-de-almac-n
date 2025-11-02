
import { readData } from '@/utils/dataManager';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Funciones de formato
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-ES');
const formatCurrency = (amount) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);

export default async function PresupuestoDetailPage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Leer todos los datos
  const quotes = await readData('presupuestos.json');
  const clients = await readData('clientes.json');

  // Encontrar el presupuesto y cliente específicos
  const quote = quotes.find(q => q.id === id);
  if (!quote) {
    notFound(); // Muestra una página 404 si no se encuentra el presupuesto
  }

  const client = clients.find(c => c.id === quote.clienteId);

  return (
    <main className="p-4 sm:p-6 lg:p-8 bg-base-200">
      <div className="max-w-4xl mx-auto">
        {/* Barra de Acciones */}
        <div className="flex items-center justify-between mb-4">
            <Link href="/presupuestos" className="btn btn-ghost">← Volver a Presupuestos</Link>
            <div className="space-x-2">
                <button className="btn btn-outline">Editar</button>
                <Link href={`/api/presupuestos/${id}/pdf`} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                  Generar PDF
                </Link>
            </div>
        </div>

        {/* Vista del Presupuesto */}
        <div className="bg-base-100 shadow-lg rounded-lg p-8 sm:p-12">
          {/* Cabecera */}
          <div className="grid grid-cols-2 items-start mb-12">
            <div>
              <h1 className="text-2xl font-bold">{process.env.COMPANY_NAME || 'Tu Empresa'}</h1>
              <p className="text-base-content/70">{process.env.COMPANY_ADDRESS || 'Tu Dirección'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold uppercase text-base-content/80">Presupuesto</h2>
              <p className="font-mono">{quote.numero}</p>
              <p className="mt-2 text-sm"><span className="font-bold">Fecha:</span> {formatDate(quote.fechaCreacion)}</p>
              <p className="text-sm"><span className="font-bold">Estado:</span> <span className="badge badge-lg">{quote.estado}</span></p>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-12">
            <h3 className="font-bold">Cliente:</h3>
            {client ? (
              <div className="text-base-content/80">
                <p className="font-bold text-lg">{client.nombre}</p>
                <p>{client.direccion}</p>
                <p>{client.telefono}</p>
                <p>{client.email}</p>
              </div>
            ) : <p>Cliente no encontrado</p>}
          </div>

          {/* Tabla de Items */}
          <table className="table w-full mb-8">
            <thead className="bg-base-200">
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-right">Precio Unit.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales y Notas */}
          <div className="grid grid-cols-2 gap-8">
            <div className="text-base-content/80">
                <h3 className="font-bold mb-2">Notas:</h3>
                <p className="text-sm">{quote.notes || 'No se añadieron notas.'}</p>
            </div>
            <div className="space-y-2 text-right">
                <div className="flex justify-between"><span className="text-base-content/70">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-base-content/70">IVA (21%)</span><span>{formatCurrency(quote.tax)}</span></div>
                <div className="divider my-1"></div>
                <div className="flex justify-between font-bold text-xl"><span >TOTAL</span><span>{formatCurrency(quote.total)}</span></div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
