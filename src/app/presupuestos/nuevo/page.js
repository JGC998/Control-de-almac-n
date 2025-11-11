import ClientOrderForm from "@/components/ClientOrderForm";
import { FilePlus } from "lucide-react";

export default function NuevoPresupuestoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FilePlus className="mr-2" />
        Crear Nuevo Presupuesto
      </h1>
      <ClientOrderForm formType="PRESUPUESTO" />
    </div>
  );
}
