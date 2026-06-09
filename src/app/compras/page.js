import HubPage from '@/componentes/layout/HubPage';
import { ShoppingCart, Truck, Ship, Package, Factory, MapPin } from 'lucide-react';

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
          titulo: 'Contenedores',
          items: [
            {
              href: '/compras/contenedores',
              icon: Ship,
              titulo: 'Contenedores',
              descripcion: 'Listado de todos los contenedores: rastreadores activos, en tránsito y recibidos. Crea un rastreador o abre la calculadora de costes.',
              accion: 'Ver contenedores',
            },
            {
              href: '/compras/contenedores/nuevo-rastreador',
              icon: MapPin,
              titulo: 'Nuevo rastreador',
              descripcion: 'Registra un contenedor en camino y recibe avisos automáticos por WhatsApp cuando cambie de estado.',
              accion: 'Nuevo rastreador',
            },
          ]
        },
        {
          titulo: 'Pedidos nacionales',
          items: [
            {
              href: '/proveedores/nuevo-nacional',
              icon: Truck,
              titulo: 'Pedido nacional',
              descripcion: 'Crea un pedido a un proveedor nacional con seguimiento de bobinas y materiales.',
              accion: 'Nuevo pedido',
            },
            {
              href: '/proveedores',
              icon: Package,
              titulo: 'Pedidos a proveedor',
              descripcion: 'Listado de todos los pedidos: pendientes, en tránsito y recibidos.',
              accion: 'Ver pedidos',
            },
          ]
        },
        {
          titulo: 'Gestión',
          items: [
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
