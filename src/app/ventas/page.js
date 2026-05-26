import HubPage from '@/componentes/layout/HubPage';
import { DollarSign, FileText, Package, FilePlus, PackagePlus } from 'lucide-react';

export const metadata = { title: 'Ventas — CRM Taller' };

export default function VentasHub() {
  return (
    <HubPage
      title="Ventas"
      descripcion="Gestión del ciclo de venta: presupuestos y pedidos de cliente."
      icon={DollarSign}
      color="primary"
      groups={[
        {
          titulo: 'Crear nuevo documento',
          items: [
            {
              href: '/presupuestos/nuevo',
              icon: FilePlus,
              titulo: 'Nuevo presupuesto',
              descripcion: 'Crea un presupuesto para un cliente desde cero o desde una plantilla.',
              accion: 'Crear presupuesto',
            },
            {
              href: '/pedidos/nuevo',
              icon: PackagePlus,
              titulo: 'Nuevo pedido',
              descripcion: 'Crea un pedido de cliente directamente o convierte un presupuesto aceptado.',
              accion: 'Crear pedido',
            },
          ]
        },
        {
          titulo: 'Ver y gestionar',
          items: [
            {
              href: '/presupuestos',
              icon: FileText,
              titulo: 'Presupuestos',
              descripcion: 'Listado de todos los presupuestos: borrador, enviados, aceptados y rechazados.',
              accion: 'Ver presupuestos',
            },
            {
              href: '/pedidos',
              icon: Package,
              titulo: 'Pedidos de cliente',
              descripcion: 'Gestiona pedidos activos: estado, líneas, PDF y confirmación.',
              accion: 'Ver pedidos',
            },
          ]
        }
      ]}
    />
  );
}
