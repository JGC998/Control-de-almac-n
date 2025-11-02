'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaUser, FaClipboardList, FaFileInvoice, FaStickyNote, FaArrowLeft } from 'react-icons/fa';

export default function ClienteDetailPage() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        // Fetch client details
        const clientRes = await fetch(`/api/clientes/${id}`);
        if (!clientRes.ok) throw new Error('Error al cargar los datos del cliente');
        setCliente(await clientRes.json());

        // Fetch orders for this client
        const pedidosRes = await fetch(`/api/pedidos?clientId=${id}`);
        if (!pedidosRes.ok) throw new Error('Error al cargar los pedidos del cliente');
        setPedidos(await pedidosRes.json());

        // Fetch presupuestos for this client
        const presupuestosRes = await fetch(`/api/presupuestos?clientId=${id}`);
        if (!presupuestosRes.ok) throw new Error('Error al cargar los presupuestos del cliente');
        setPresupuestos(await presupuestosRes.json());

        // Fetch notes for this client (assuming notes can be linked by clientId)
        const notasRes = await fetch(`/api/notas?clientId=${id}`);
        if (!notasRes.ok) throw new Error('Error al cargar las notas del cliente');
        setNotas(await notasRes.json());

      } catch (err) {
        console.error("Error fetching client history:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando historial del cliente...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-error">Error: {error}</div>;
  }

  if (!cliente) {
    return <div className="container mx-auto p-4 text-center">Cliente no encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/gestion/clientes" className="btn btn-ghost mb-4"><FaArrowLeft className="mr-2" /> Volver a Gestión de Clientes</Link>
      
      <div className="card bg-base-100 shadow-xl p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2"><FaUser /> Historial de {cliente.nombre}</h1>
        <p><strong>ID del Cliente:</strong> {cliente.id}</p>
        {/* Add more client details here if available in client object */}
      </div>

      {/* Sección de Pedidos */}
      <div className="card bg-base-100 shadow-xl p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><FaClipboardList /> Pedidos ({pedidos.length})</h2>
        {pedidos.length > 0 ? (
          <ul className="list-disc list-inside">
            {pedidos.map(pedido => (
              <li key={pedido.id} className="mb-1">
                Pedido #{pedido.id} - Fecha: {new Date(pedido.fecha).toLocaleDateString()} - Estado: {pedido.estado}
                {/* Add link to order detail page if available */}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay pedidos registrados para este cliente.</p>
        )}
      </div>

      {/* Sección de Presupuestos */}
      <div className="card bg-base-100 shadow-xl p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><FaFileInvoice /> Presupuestos ({presupuestos.length})</h2>
        {presupuestos.length > 0 ? (
          <ul className="list-disc list-inside">
            {presupuestos.map(presupuesto => (
              <li key={presupuesto.id} className="mb-1">
                Presupuesto #{presupuesto.id} - Fecha: {new Date(presupuesto.fecha).toLocaleDateString()} - Total: {presupuesto.total}
                {/* Add link to presupuesto detail page if available */}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay presupuestos registrados para este cliente.</p>
        )}
      </div>

      {/* Sección de Notas */}
      <div className="card bg-base-100 shadow-xl p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><FaStickyNote /> Notas ({notas.length})</h2>
        {notas.length > 0 ? (
          <ul className="list-disc list-inside">
            {notas.map(nota => (
              <li key={nota.id} className="mb-1">
                Fecha: {new Date(nota.fecha).toLocaleDateString()} - {nota.contenido}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hay notas registradas para este cliente.</p>
        )}
      </div>
    </div>
  );
}
