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
      groups={[
        {
          titulo: 'Tarifas',
          items: [
            {
              href: '/tarifas',
              icon: Layers,
              titulo: 'Tarifa de precios',
              descripcion: 'Precios de venta por m² y por rollo para cada material y espesor.',
              accion: 'Ver tarifas',
            },
            {
              href: '/almacen/tarifas-correas',
              icon: Cable,
              titulo: 'Tarifa metrajes',
              descripcion: 'Precio por m² y por metro lineal para cada referencia de bobina transportadora.',
              accion: 'Ver tarifas',
            },
          ],
        },
        {
          titulo: 'Inventario',
          items: [
            {
              href: '/almacen/stock',
              icon: BarChart3,
              titulo: 'Stock de rollos',
              descripcion: 'Inventario físico de rollos por material y espesor: metros disponibles y stock mínimo.',
              accion: 'Ver stock',
            },
            {
              href: '/gestion/catalogos/materiales',
              icon: FlaskConical,
              titulo: 'Materiales',
              descripcion: 'Tipos de materiales dados de alta en el catálogo: GOMA, PVC, CAUCHO…',
              accion: 'Ver materiales',
            },
          ],
        },
        {
          titulo: 'Catálogo',
          items: [
            {
              href: '/gestion/productos',
              icon: Package,
              titulo: 'Productos',
              descripcion: 'Catálogo completo de productos con tarifas, costes, pesos y referencias de fabricante.',
              accion: 'Ver productos',
            },
            {
              href: '/almacen/estrellas',
              icon: Star,
              titulo: 'Estrellas',
              descripcion: 'Productos tipo estrella con sus medidas de plancha: cuántas unidades salen de cada tamaño de corte.',
              accion: 'Ver estrellas',
            },
            {
              href: '/almacen/bandas',
              icon: RectangleHorizontal,
              titulo: 'Bandas PVC',
              descripcion: 'Listado de bandas PVC guardadas desde la calculadora. Consulta dimensiones, color, precio y peso.',
              accion: 'Ver bandas',
            },
          ],
        },
        {
          titulo: 'Accesorios',
          items: [
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
          ],
        },
      ]}
    />
  );
}
