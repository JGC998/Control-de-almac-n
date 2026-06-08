import HubPage from '@/componentes/layout/HubPage';
import { Wrench, Calculator, Truck, TrendingDown, TrendingUp, FileText, Ruler, Scale, Factory } from 'lucide-react';

export const metadata = { title: 'Herramientas — CRM Taller' };

export default function HerramientasHub() {
  return (
    <HubPage
      title="Herramientas"
      descripcion="Calculadoras especializadas para presupuestar y optimizar precios."
      icon={Wrench}
      color="warning"
      items={[
        {
          href: '/calculadora/bandas',
          icon: Calculator,
          titulo: 'Calculadora de bandas PVC',
          descripcion: 'Calcula el precio de fabricación de una banda PVC a partir de material, dimensiones y tipo de confección.',
          accion: 'Abrir calculadora',
        },
        {
          href: '/calculadora/metrajes',
          icon: Ruler,
          titulo: 'Calculadora de metrajes',
          descripcion: 'Calcula el precio de metros lineales de tira PVC a un ancho determinado, sin confección. Ideal para presupuestar material en rollo.',
          accion: 'Calcular metraje',
        },
        {
          href: '/calculadora/logistica',
          icon: Truck,
          titulo: 'Calculadora de envíos',
          descripcion: 'Calcula el coste de transporte y paletizado según destino, peso y tipología de palet.',
          accion: 'Calcular envío',
        },
        {
          href: '/calculadora/inversa',
          icon: TrendingDown,
          titulo: 'Calculadora inversa',
          descripcion: 'Parte del precio de venta deseado y calcula el coste máximo admisible o el margen resultante.',
          accion: 'Calcular inverso',
        },
        {
          href: '/herramientas/carta-porte',
          icon: FileText,
          titulo: 'Carta de porte',
          descripcion: 'Genera un albarán de expedición PDF con datos de expedidor, destinatario, mercancía e inventario detallado de palés.',
          accion: 'Crear carta de porte',
        },
        {
          href: '/herramientas/comparativa-reparto',
          icon: Scale,
          titulo: 'Comparativa reparto de gastos',
          descripcion: 'Compara dos métodos de distribuir los gastos de importación entre los artículos: prorrateo por valor económico vs. porcentaje fijo por metro.',
          accion: 'Ver comparativa',
        },
        {
          href: '/herramientas/analisis-rentabilidad',
          icon: TrendingUp,
          titulo: 'Semáforo de rentabilidad',
          descripcion: 'Compara el coste real de cada bobina importada con tu tarifa de venta actual. Muestra en verde, amarillo o rojo si estás vendiendo con margen suficiente.',
          accion: 'Analizar importación',
        },
        {
          href: '/herramientas/comparativa-proveedores',
          icon: Factory,
          titulo: 'Comparativa de proveedores',
          descripcion: 'Historial de precios por proveedor y material. Gráfico de evolución y resumen: quién vende más barato y en qué porcentaje.',
          accion: 'Comparar proveedores',
        },
      ]}
    />
  );
}
