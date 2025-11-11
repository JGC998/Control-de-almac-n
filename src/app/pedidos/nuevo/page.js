import ClientOrderForm from "@/components/ClientOrderForm";
import { Package } from "lucide-react";

export default function NuevoPedidoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Package className="mr-2" />
        Crear Nuevo Pedido
      </h1>
      {/* Pasar formType="PEDIDO" para ocultar la selección de margen */}
      <ClientOrderForm formType="PEDIDO" />
    </div>
  );
}
