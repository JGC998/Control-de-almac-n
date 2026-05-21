import HubPage from '@/componentes/layout/HubPage';
import { ShoppingCart, Truck, Ship, Package, Factory } from 'lucide-react';

export const metadata = { title: 'Compras — CRM Taller' };

export default function ComprasHub() {
  return (
    <HubPage
      title="Compras"
      descripcion="Gestión de pedidos a proveedores: nacionales e importaciones."
      icon={ShoppingCart}
      color="secondary"
      groups={[
        {
          titulo: 'Crear pedido',
          items: [
            {
              href: '/proveedores/nuevo-nacional',
              icon: Truck,
              titulo: 'Pedido nacional',
              descripcion: 'Crea un pedido a un proveedor nacional con seguimiento de bobinas y materiales.',
              accion: 'Nuevo pedido',
            },
            {
              href: '/proveedores/nuevo-importacion',
              icon: Ship,
              titulo: 'Importación',
              descripcion: 'Gestiona una importación: contenedor, naviera, tasa de cambio y fecha estimada de llegada.',
              accion: 'Nueva importación',
            },
          ]
        },
        {
          titulo: 'Ver y gestionar',
          items: [
            {
              href: '/proveedores',
              icon: Package,
              titulo: 'Pedidos a proveedor',
              descripcion: 'Listado de todos los pedidos: pendientes, en tránsito y recibidos.',
              accion: 'Ver pedidos',
            },
            {
              href: '/gestion/catalogos/proveedores',
              icon: Factory,
              titulo: 'Proveedores',
              descripcion: 'Catálogo de proveedores con datos de contacto e historial de pedidos.',
              accion: 'Ver proveedores',
            },
          ]
        }
      ]}
    />
  );
}
