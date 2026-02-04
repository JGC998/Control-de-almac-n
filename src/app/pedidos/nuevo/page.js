import FormularioPedidoCliente from "@/componentes/pedidos/FormularioPedidoCliente";
import { Package } from "lucide-react";

export default function NuevoPedidoPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Package className="mr-2" />
        Crear Nuevo Pedido
      </h1>
      <FormularioPedidoCliente formType="PEDIDO" />
    </div>
  );
}
