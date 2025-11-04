import PedidoProveedorForm from "@/components/PedidoProveedorForm";
import { PackageOpen } from "lucide-react";

export default function NuevoPedidoImportacionPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <PackageOpen className="mr-2" />
        Nuevo Contenedor (Importación)
      </h1>
      <PedidoProveedorForm tipo="IMPORTACION" />
    </div>
  );
}
