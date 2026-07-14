import HubPage from '@/componentes/layout/HubPage';
import { Users, DollarSign, Tag } from 'lucide-react';

export const metadata = { title: 'Gestión — CRM Taller' };

export default function GestionHub() {
  return (
    <HubPage
      title="Gestión"
      descripcion="Clientes, catálogos y tarifas de materiales."
      icon={Users}
      color="accent"
      items={[
        {
          href: '/gestion/clientes',
          icon: Users,
          titulo: 'Clientes',
          descripcion: 'Ficha de cada cliente con historial de pedidos, presupuestos y condiciones especiales de precio.',
          accion: 'Ver clientes',
        },
        {
          href: '/gestion/catalogos/familias',
          icon: Tag,
          titulo: 'Familias y subfamilias',
          descripcion: 'Organiza el catálogo de productos por familia (GOMA, PVC, ACCESORIO…) y subfamilia.',
          accion: 'Gestionar familias',
        },
        {
          href: '/tarifas',
          icon: DollarSign,
          titulo: 'Tarifas de material',
          descripcion: 'Precios por metro para cada combinación de material, espesor y color. Base del motor de precios.',
          accion: 'Ver tarifas',
        },
      ]}
    />
  );
}
