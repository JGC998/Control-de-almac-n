import HubPage from '@/componentes/layout/HubPage';
import { Users, DollarSign, Tag, Package, Factory, Layers } from 'lucide-react';

export const metadata = { title: 'Gestión — CRM Taller' };

export default function GestionHub() {
  return (
    <HubPage
      title="Gestión"
      descripcion="Clientes, catálogo de productos, proveedores y tarifas."
      icon={Users}
      color="accent"
      groups={[
        {
          titulo: 'Comercial',
          items: [
            {
              href: '/gestion/clientes',
              icon: Users,
              titulo: 'Clientes',
              descripcion: 'Ficha de cada cliente con historial de pedidos, presupuestos y condiciones especiales de precio.',
              accion: 'Ver clientes',
            },
            {
              href: '/gestion/productos',
              icon: Package,
              titulo: 'Productos',
              descripcion: 'Catálogo de productos: bandas, accesorios y bordos. Precios, dimensiones, material y stock.',
              accion: 'Ver productos',
            },
            {
              href: '/gestion/catalogos/proveedores',
              icon: Factory,
              titulo: 'Proveedores',
              descripcion: 'Catálogo de proveedores con datos de contacto e historial de pedidos.',
              accion: 'Ver proveedores',
            },
          ],
        },
        {
          titulo: 'Catálogo',
          items: [
            {
              href: '/gestion/catalogos/materiales',
              icon: Layers,
              titulo: 'Materiales',
              descripcion: 'Tipos de material: GOMA, PVC, FIELTRO, VERDE… Base de la clasificación y el motor de precios.',
              accion: 'Gestionar materiales',
            },
            {
              href: '/gestion/catalogos/familias',
              icon: Tag,
              titulo: 'Familias',
              descripcion: 'Organiza el catálogo por familia (GOMA, PVC, ACCESORIO…) y subfamilia.',
              accion: 'Gestionar familias',
            },
            {
              href: '/gestion/catalogos/fabricantes',
              icon: Factory,
              titulo: 'Fabricantes',
              descripcion: 'Catálogo de fabricantes asociados a los productos del almacén.',
              accion: 'Gestionar fabricantes',
            },
            {
              href: '/tarifas',
              icon: DollarSign,
              titulo: 'Tarifas de material',
              descripcion: 'Precios por metro cuadrado para cada combinación de material, espesor y variante.',
              accion: 'Ver tarifas',
            },
          ],
        },
      ]}
    />
  );
}
