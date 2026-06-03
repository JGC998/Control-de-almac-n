import { redirect } from 'next/navigation';

// La calculadora de contenedor se ha movido a /herramientas/calculadora-contenedor
export default function NuevoPedidoImportacionPage() {
  redirect('/herramientas/calculadora-contenedor');
}
