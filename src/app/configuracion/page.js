import HubPage from '@/componentes/layout/HubPage';
import { Settings, DollarSign, Truck, Layers, ScrollText, Package } from 'lucide-react';

export const metadata = { title: 'Configuración — CRM Taller' };

export default function ConfiguracionHub() {
  return (
    <HubPage
      title="Configuración"
      descripcion="Ajusta los parámetros del sistema: márgenes, logística, tacos y registros de auditoría."
      icon={Settings}
      color="neutral"
      items={[
        {
          href: '/configuracion/margenes',
          icon: DollarSign,
          titulo: 'Márgenes y Referencias',
          descripcion: 'Reglas de margen por tipo de cliente, materiales de referencia y ajustes de precio.',
          accion: 'Configurar márgenes',
        },
        {
          href: '/configuracion/logistica',
          icon: Truck,
          titulo: 'Logística',
          descripcion: 'Tarifas de transporte por provincia, configuración de paletizado y gastos de envío.',
          accion: 'Configurar logística',
        },
        {
          href: '/configuracion/tacos',
          icon: Layers,
          titulo: 'Tacos',
          descripcion: 'Precios por metro de tacos (U, T, V, CUT) usados en el cálculo de bandas PVC.',
          accion: 'Configurar tacos',
        },
        {
          href: '/gestion/catalogos/materiales',
          icon: Package,
          titulo: 'Materiales',
          descripcion: 'Gestiona la lista de tipos de material: GOMA, PVC, FIELTRO, etc. y consulta cuántos productos y tarifas tiene cada uno.',
          accion: 'Gestionar materiales',
        },
        {
          href: '/configuracion/audit-log',
          icon: ScrollText,
          titulo: 'Audit Log',
          descripcion: 'Registro de todas las acciones: creaciones, ediciones y eliminaciones.',
          accion: 'Ver registros',
        },
      ]}
    />
  );
}
