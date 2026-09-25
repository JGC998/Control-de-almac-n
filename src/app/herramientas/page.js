import HubPage from '@/componentes/layout/HubPage';
import { Wrench, Calculator, Truck, TrendingUp, FileText, Ruler, Factory, QrCode, BarChart2, Timer } from 'lucide-react';

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
          href: '/herramientas/carta-porte',
          icon: FileText,
          titulo: 'Carta de porte',
          descripcion: 'Genera un albarán de expedición PDF con datos de expedidor, destinatario, mercancía e inventario detallado de palés.',
          accion: 'Crear carta de porte',
        },
        {
          href: '/herramientas/analisis-rentabilidad',
          icon: TrendingUp,
          titulo: 'Semáforo de rentabilidad',
          descripcion: 'Compara el coste real de cada bobina importada con tu tarifa de venta actual. Muestra en verde, amarillo o rojo si estás vendiendo con margen suficiente.',
          accion: 'Analizar importación',
        },
        {
          href: '/herramientas/dashboard-margenes',
          icon: BarChart2,
          titulo: 'Dashboard de márgenes',
          descripcion: 'Vista global de todos los materiales con su coste de importación, precio de venta y margen real. Ordenada de peor a mejor margen para actuar rápido.',
          accion: 'Ver márgenes',
        },
        {
          href: '/herramientas/comparativa-proveedores',
          icon: Factory,
          titulo: 'Comparativa de proveedores',
          descripcion: 'Historial de precios por proveedor y material. Gráfico de evolución y resumen: quién vende más barato y en qué porcentaje.',
          accion: 'Comparar proveedores',
        },
        {
          href: '/herramientas/accesos-qr',
          icon: QrCode,
          titulo: 'Accesos rápidos QR',
          descripcion: 'Genera códigos QR para las páginas más usadas. Imprímelos y pégalos en el taller para abrir cualquier sección desde el móvil de un escaneo.',
          accion: 'Generar QR codes',
        },
        {
          href: '/herramientas/estadisticas-pedidos',
          icon: Timer,
          titulo: 'Estadísticas de pedidos',
          descripcion: 'Tiempo medio de fabricación por pedido: desde la creación hasta la entrega. Desglosado por familia de producto, tamaño del pedido y tendencia mensual.',
          accion: 'Ver estadísticas',
        },
      ]}
    />
  );
}
