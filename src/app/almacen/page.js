import HubPage from '@/componentes/layout/HubPage';
import { Warehouse, Layers, Link2, AlignJustify, Package, RectangleHorizontal, BarChart3, FlaskConical, Star, Cable } from 'lucide-react';

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
          href: '/gestion/catalogos/materiales',
          icon: FlaskConical,
          titulo: 'Materiales',
          descripcion: 'Tipos de materiales dados de alta en el catálogo: GOMA, PVC, CAUCHO…',
          accion: 'Ver materiales',
        },
        {
          href: '/almacen/stock',
          icon: BarChart3,
          titulo: 'Stock de rollos',
          descripcion: 'Inventario físico de rollos por material y espesor: metros disponibles y stock mínimo.',
          accion: 'Ver stock',
        },
        {
          href: '/almacen/estrellas',
          icon: Star,
          titulo: 'Estrellas',
          descripcion: 'Productos tipo estrella con sus medidas de plancha: cuántas unidades salen de cada tamaño de corte.',
          accion: 'Ver estrellas',
        },
        {
          href: '/almacen/tarifas-correas',
          icon: Cable,
          titulo: 'Tarifas de correas',
          descripcion: 'Precio de venta por m² y por metro lineal para cada referencia de bobina transportadora.',
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
