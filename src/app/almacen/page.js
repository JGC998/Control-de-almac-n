import HubPage from '@/componentes/layout/HubPage';
import { Warehouse, Layers, Package, Factory, Link2, AlignJustify, Box } from 'lucide-react';

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
        {
          href: '/almacen/articulos',
          icon: Box,
          titulo: 'Artículos varios',
          descripcion: 'Cordón, borde ondulado y otros artículos que se venden tal como llegan.',
          accion: 'Ver artículos',
        },
      ]}
    />
  );
}
