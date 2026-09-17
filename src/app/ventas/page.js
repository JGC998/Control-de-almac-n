import HubPage from '@/componentes/layout/HubPage';
import { DollarSign, FileText, Package, FilePlus, PackagePlus, FileCheck, Layers, Ruler } from 'lucide-react';

export const metadata = { title: 'Ventas — CRM Taller' };

export default function VentasHub() {
  return (
    <HubPage
      title="Ventas"
      descripcion="Gestión del ciclo de venta: presupuestos, pedidos y albaranes."
      icon={DollarSign}
      color="primary"
      groups={[
        {
          titulo: 'Crear nuevo documento',
          items: [
            {
              href: '/albaranes/nuevo',
              icon: FileCheck,
              titulo: 'Nuevo albarán',
              descripcion: 'Genera un albarán de entrega sin valorar para que el cliente se lleve en mano.',
              accion: 'Crear albarán',
            },
            {
              href: '/presupuestos/nuevo',
              icon: FilePlus,
              titulo: 'Nuevo presupuesto',
              descripcion: 'Crea un presupuesto para un cliente desde cero o desde una plantilla.',
              accion: 'Crear presupuesto',
            },
            {
              href: '/pedidos/nuevo',
              icon: PackagePlus,
              titulo: 'Nuevo pedido',
              descripcion: 'Crea un pedido de cliente directamente o convierte un presupuesto aceptado.',
              accion: 'Crear pedido',
            },
          ]
        },
        {
          titulo: 'Calculadoras',
          items: [
            {
              href: '/ventas/calculadora-bandas',
              icon: Layers,
              titulo: 'Bandas PVC',
              descripcion: 'Calcula el precio de una banda PVC paso a paso: espesor, confección, dimensiones.',
              accion: 'Calcular',
            },
            {
              href: '/ventas/calculadora-metrajes',
              icon: Ruler,
              titulo: 'Metrajes',
              descripcion: 'Precio de material por metros lineales para cualquier material del catálogo.',
              accion: 'Calcular',
            },
          ]
        },
        {
          titulo: 'Ver y gestionar',
          items: [
            {
              href: '/albaranes',
              icon: FileCheck,
              titulo: 'Albaranes',
              descripcion: 'Listado de albaranes emitidos: pendientes, entregados y cancelados.',
              accion: 'Ver albaranes',
            },
            {
              href: '/presupuestos',
              icon: FileText,
              titulo: 'Presupuestos',
              descripcion: 'Listado de todos los presupuestos: borrador, enviados, aceptados y rechazados.',
              accion: 'Ver presupuestos',
            },
            {
              href: '/pedidos',
              icon: Package,
              titulo: 'Pedidos de cliente',
              descripcion: 'Gestiona pedidos activos: estado, líneas, PDF y confirmación.',
              accion: 'Ver pedidos',
            },
          ]
        }
      ]}
    />
  );
}
