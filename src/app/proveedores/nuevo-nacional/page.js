import PedidoProveedorForm from "@/components/PedidoProveedorForm";
import { Truck } from "lucide-react";

export default function NuevoPedidoNacionalPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Truck className="mr-2" />
        Nuevo Pedido Nacional
      </h1>
      <PedidoProveedorForm tipo="NACIONAL" />
    </div>
  );
}
