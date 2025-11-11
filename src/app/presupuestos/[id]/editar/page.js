"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import ClientOrderForm from "@/components/ClientOrderForm";
import { Edit } from "lucide-react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function EditarPresupuestoPage() {
  const params = useParams();
  const { id } = params;

  // Cargar los datos iniciales del presupuesto
  const { data: initialData, error, isLoading } = useSWR(id ? `/api/presupuestos/${id}` : null, fetcher);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><span className="loading loading-spinner loading-lg"></span></div>;
  if (error) return <div className="text-red-500 text-center">Error al cargar el presupuesto para editar.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Edit className="mr-2" />
        Editar Presupuesto ( {initialData?.numero} )
      </h1>
      <ClientOrderForm formType="PRESUPUESTO" initialData={initialData} />
    </div>
  );
}
