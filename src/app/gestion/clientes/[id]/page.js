"use client";
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { User, FileText, Package, Edit, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const InfoCard = ({ title, value, icon }) => (
  <div className="flex items-center p-4 bg-base-200 rounded-lg">
    {React.cloneElement(icon, { className: "w-5 h-5 mr-3 text-primary" })}
    <div>
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-lg font-semibold">{value || '-'}</div>
    </div>
  </div>
);

const SectionList = ({ title, data, pathPrefix }) => (
  <div className="bg-base-100 shadow-xl rounded-lg p-6">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <div className="overflow-y-auto max-h-60">
      {data && data.length > 0 ? (
        <ul className="divide-y divide-base-300">
          {data.map(item => (
            <li key={item.id} className="py-2 flex justify-between items-center hover:bg-base-200 px-2 rounded">
              <Link href={`/${pathPrefix}/${item.id}`} className="link link-primary">
                {item.numero}
              </Link>
              <span className="text-sm text-gray-500">{new Date(item.fechaCreacion).toLocaleDateString()}</span>
              <span className={`badge ${item.estado === 'Aceptado' || item.estado === 'Completado' ? 'badge-success' : 'badge-warning'}`}>
                {item.estado}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No hay {title.toLowerCase()} para este cliente.</p>
      )}
    </div>
  </div>
);

export default function ClienteDetalle() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const { data: cliente, error: clienteError, isLoading: clienteLoading } = useSWR(id ? `/api/clientes/${id}` : null, fetcher);
  const { data: pedidos, error: pedidosError, isLoading: pedidosLoading } = useSWR(id ? `/api/pedidos?clientId=${id}` : null, fetcher);
  const { data: presupuestos, error: presupuestosError, isLoading: presupuestosLoading } = useSWR(id ? `/api/presupuestos?clientId=${id}` : null, fetcher);

  const isLoading = clienteLoading || pedidosLoading || presupuestosLoading;

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  if (clienteError) {
    return <div className="text-red-500 text-center">Error al cargar el cliente.</div>;
  }
  
  if (!cliente) {
    return <div className="text-center">Cliente no encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.back()} className="btn btn-ghost mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Cabecera del Cliente */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center"><User className="mr-2" /> {cliente.nombre}</h1>
        <button onClick={() => alert('Función de editar no conectada a modal')} className="btn btn-outline btn-primary">
          <Edit className="w-4 h-4" /> Editar Cliente
        </button>
      </div>

      {/* Tarjetas de Información */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <InfoCard title="Email" value={cliente.email} icon={<Mail />} />
        <InfoCard title="Teléfono" value={cliente.telefono} icon={<Phone />} />
        <InfoCard title="Dirección" value={cliente.direccion} icon={<MapPin />} />
      </div>

      {/* Secciones de Pedidos y Presupuestos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionList title="Presupuestos Recientes" data={presupuestos} pathPrefix="presupuestos" />
        <SectionList title="Pedidos Recientes" data={pedidos} pathPrefix="pedidos" />
      </div>
    </div>
  );
}
