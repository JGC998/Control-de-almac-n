import HubPage from '@/componentes/layout/HubPage';
import { Settings, DollarSign, Truck, ScrollText, Hash, Link2 } from 'lucide-react';

export const metadata = { title: 'Configuración — CRM Taller' };

export default function ConfiguracionHub() {
  return (
    <HubPage
      title="Configuración"
      descripcion="Ajusta los parámetros del sistema: márgenes, logística y registros de auditoría."
      icon={Settings}
      color="neutral"
      items={[
        {
          href: '/configuracion/margenes',
          icon: DollarSign,
          titulo: 'Márgenes y tarifas',
          descripcion: 'Reglas de margen por tipo de cliente, tarifas de material m², tarifas por rollo y confección PVC.',
          accion: 'Configurar márgenes',
        },
        {
          href: '/configuracion/referencias',
          icon: Link2,
          titulo: 'Referencias de bobina',
          descripcion: 'Catálogo de referencias de bobina con ancho, número de lonas y peso por metro lineal.',
          accion: 'Ver referencias',
        },
        {
          href: '/configuracion/logistica',
          icon: Truck,
          titulo: 'Logística',
          descripcion: 'Tarifas de transporte por provincia, configuración de paletizado y gastos de envío.',
          accion: 'Configurar logística',
        },
        {
          href: '/configuracion/nomenclatura',
          icon: Hash,
          titulo: 'Nomenclatura',
          descripcion: 'Personaliza los alias de familias, el número de caracteres de cada segmento y el modo de abreviatura del fabricante en los códigos automáticos.',
          accion: 'Configurar nomenclatura',
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
