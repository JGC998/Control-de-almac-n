import HubPage from '@/componentes/layout/HubPage';
import { Warehouse, Layers, Link2, AlignJustify, Package, RectangleHorizontal } from 'lucide-react';

export const metadata = { title: 'Almacén — CRM Taller' };

export default function AlmacenHub() {
  return (
    <HubPage
      title="Almacén"
      descripcion="Catálogo unificado de todo lo que entra y se vende en el taller."
      icon={Warehouse}
      color="info"
      items={[
        {
          href: '/tarifas',
          icon: Layers,
          titulo: 'Rollos y materiales',
          descripcion: 'Tarifas de material por m² y por rollo. Consulta y edita precios de venta y coste.',
          accion: 'Ver tarifas',
        },
        {
          href: '/almacen/bandas',
          icon: RectangleHorizontal,
          titulo: 'Bandas PVC',
          descripcion: 'Listado de bandas PVC guardadas desde la calculadora. Consulta dimensiones, color, precio y peso.',
          accion: 'Ver bandas',
        },
        {
          href: '/gestion/productos',
          icon: Package,
          titulo: 'Productos',
          descripcion: 'Catálogo completo de productos con tarifas, costes, pesos y referencias de fabricante.',
          accion: 'Ver productos',
        },
        {
          href: '/configuracion/grapas',
          icon: Link2,
          titulo: 'Grapas',
          descripcion: 'Tipos de grapas de unión de bandas: Flexco, MLT, Alligator… con precio por metro.',
          accion: 'Ver grapas',
        },
        {
          href: '/configuracion/tacos',
          icon: AlignJustify,
          titulo: 'Tacos',
          descripcion: 'Tacos rectos e inclinados por altura y precio por metro lineal.',
          accion: 'Ver tacos',
        },
      ]}
    />
  );
}
