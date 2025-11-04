"use client";
import { useParams, notFound } from 'next/navigation';
import useSWR from 'swr';
import PedidoProveedorForm from "@/components/PedidoProveedorForm";
import { Edit } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EditarPedidoProveedorPage() {
  const params = useParams();
  const { id } = params;

  const { data: initialData, error, isLoading } = useSWR(id ? `/api/pedidos-proveedores-data/${id}` : null, fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return notFound();
  if (!initialData) return <div className="text-center">Pedido no encontrado.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Edit className="mr-2" />
        Editar Pedido ({initialData.proveedor.nombre} - {initialData.material})
      </h1>
      <PedidoProveedorForm tipo={initialData.tipo} initialData={initialData} />
    </div>
  );
}
