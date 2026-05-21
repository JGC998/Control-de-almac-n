import HubPage from '@/componentes/layout/HubPage';
import { DollarSign, FileText, Package, Clipboard, Receipt, FilePlus, PackagePlus } from 'lucide-react';

export const metadata = { title: 'Ventas — CRM Taller' };

export default function VentasHub() {
  return (
    <HubPage
      title="Ventas"
      descripcion="Ciclo completo de venta: presupuesto → pedido → albarán → factura."
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
            {
              href: '/albaranes/nuevo',
              icon: Clipboard,
              titulo: 'Nuevo albarán',
              descripcion: 'Genera un albarán de entrega a partir de un pedido confirmado.',
              accion: 'Crear albarán',
            },
            {
              href: '#',
              icon: Receipt,
              titulo: 'Nueva factura',
              descripcion: 'Emite una factura desde un albarán o directamente desde un pedido.',
              accion: 'Crear factura',
              disabled: true,
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
            {
              href: '/albaranes',
              icon: Clipboard,
              titulo: 'Albaranes',
              descripcion: 'Listado de albaranes emitidos y su estado de entrega.',
              accion: 'Ver albaranes',
            },
            {
              href: '#',
              icon: Receipt,
              titulo: 'Facturas',
              descripcion: 'Listado de facturas emitidas, pagadas y pendientes.',
              accion: 'Ver facturas',
              disabled: true,
            },
          ]
        }
      ]}
    />
  );
}
