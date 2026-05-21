import HubPage from '@/componentes/layout/HubPage';
import { Warehouse, Layers, Package, Factory } from 'lucide-react';

export const metadata = { title: 'Almacén — CRM Taller' };

export default function AlmacenHub() {
  return (
    <HubPage
      title="Almacén"
      descripcion="Gestiona el catálogo de materiales, productos y fabricantes con los que trabajas."
      icon={Warehouse}
      color="info"
      items={[
        {
          href: '/gestion/catalogos/materiales',
          icon: Layers,
          titulo: 'Materiales',
          descripcion: 'Tipos de material base: PVC, caucho, poliuretano, silicona… Usados en tarifas y cálculos.',
          accion: 'Ver materiales',
        },
        {
          href: '/gestion/productos',
          icon: Package,
          titulo: 'Productos',
          descripcion: 'Catálogo completo de productos con tarifas, costes, pesos y referencias de fabricante.',
          accion: 'Ver productos',
        },
        {
          href: '/gestion/catalogos/fabricantes',
          icon: Factory,
          titulo: 'Fabricantes',
          descripcion: 'Catálogo de fabricantes vinculados a los productos del sistema.',
          accion: 'Ver fabricantes',
        },
        {
          href: '/almacen/stock',
          icon: Warehouse,
          titulo: 'Stock e inventario',
          descripcion: 'Control de existencias: metros disponibles por material, bobinas y movimientos de entrada/salida.',
          accion: 'Ver stock',
          badge: 'Inventario',
        },
      ]}
    />
  );
}
