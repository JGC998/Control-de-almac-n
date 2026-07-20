"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator,
  Users, Settings, Layers, Factory, ChevronDown, BarChart2, Scale,
  TrendingUp, TrendingDown, Ship, Tag, Wrench, Ruler, QrCode
} from 'lucide-react';

const menuStructure = [
  {
    category: 'Dashboard',
    icon: Home,
    single: true,
    links: [
      { href: '/', label: 'Inicio', icon: Home }
    ]
  },
  {
    category: 'Ventas',
    icon: DollarSign,
    links: [
      { href: '/presupuestos', label: 'Presupuestos', icon: FileText },
      { href: '/pedidos', label: 'Pedidos cliente', icon: Package }
    ]
  },
  {
    category: 'Compras',
    icon: Truck,
    links: [
      { href: '/compras/contenedores', label: 'Contenedores', icon: Ship },
      { href: '/proveedores', label: 'Pedidos proveedor', icon: Truck },
    ]
  },
  {
    category: 'Almacén',
    icon: Warehouse,
    single: true,
    links: [
      { href: '/almacen', label: 'Stock', icon: Warehouse }
    ]
  },
  {
    category: 'Calculadoras',
    icon: Calculator,
    links: [
      { href: '/calculadora', label: 'Piezas (m²)', icon: Layers },
      { href: '/calculadora/bandas', label: 'Bandas PVC', icon: Calculator },
      { href: '/calculadora/metrajes', label: 'Metrajes', icon: Ruler },
      { href: '/calculadora/logistica', label: 'Envíos', icon: Truck },
      { href: '/calculadora/inversa', label: 'Inversa', icon: TrendingDown },
    ]
  },
  {
    category: 'Herramientas',
    icon: Wrench,
    links: [
      { href: '/herramientas/carta-porte', label: 'Carta de porte', icon: FileText },
      { href: '/herramientas/comparativa-reparto', label: 'Comparativa reparto', icon: Scale },
      { href: '/herramientas/analisis-rentabilidad', label: 'Semáforo rentabilidad', icon: TrendingUp },
      { href: '/herramientas/comparativa-proveedores', label: 'Comparativa proveedores', icon: Factory },
      { href: '/herramientas/accesos-qr', label: 'Accesos QR', icon: QrCode },
    ]
  },
  {
    category: 'Gestión',
    icon: Users,
    links: [
      { href: '/gestion/clientes', label: 'Clientes', icon: Users },
      { href: '/gestion/productos', label: 'Productos', icon: Package },
      { href: '/gestion/catalogos/proveedores', label: 'Proveedores', icon: Factory },
      { href: '/gestion/catalogos/materiales', label: 'Materiales', icon: Layers },
      { href: '/gestion/catalogos/familias', label: 'Familias', icon: Tag },
      { href: '/gestion/catalogos/fabricantes', label: 'Fabricantes', icon: Factory },
    ]
  },
  {
    category: 'Documentos',
    icon: FileText,
    single: true,
    links: [
      { href: '/gestion/documentos', label: 'Planos', icon: FileText }
    ]
  },
  {
    category: 'Tarifas',
    icon: DollarSign,
    single: true,
    links: [
      { href: '/tarifas', label: 'Tarifas Materiales', icon: DollarSign }
    ]
  },
  {
    category: 'Informes',
    icon: BarChart2,
    single: true,
    links: [
      { href: '/informes', label: 'Informes', icon: BarChart2 }
    ]
  },
  {
    category: 'Configuración',
    icon: Settings,
    links: [
      { href: '/configuracion/margenes', label: 'Márgenes', icon: DollarSign },
      { href: '/configuracion/logistica', label: 'Logística', icon: Truck },
      { href: '/configuracion/tacos', label: 'Tacos', icon: Layers },
      { href: '/configuracion/grapas', label: 'Grapas', icon: Settings },
      { href: '/configuracion/audit-log', label: 'Audit Log', icon: FileText }
    ]
  }
];

export default function BarraLateral() {
  const pathname = usePathname();
  const [openCategories, setOpenCategories] = useState(['Dashboard', 'Ventas', 'Calculadoras']);

  const isLinkActive = (href) => {
    if (pathname === href) return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  const toggleCategory = (category) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="w-64 bg-base-300 p-4 flex flex-col h-full">
      <Link href="/" className="btn btn-ghost text-xl normal-case mb-4">
        CRM Taller
      </Link>

      <ul className="menu grow">
        {menuStructure.map(({ category, icon: CategoryIcon, links, single }) => {
          const isOpen = openCategories.includes(category);

          // Si es categoría única (single link), renderizar directamente
          if (single && links.length === 1) {
            const link = links[0];
            return (
              <li key={category}>
                <Link
                  href={link.href}
                  className={`${isLinkActive(link.href) ? 'active' : ''}`}
                >
                  <CategoryIcon className="w-4 h-4" />
                  {category}
                </Link>
              </li>
            );
          }

          // Categoría con múltiples enlaces (colapsable)
          return (
            <li key={category}>
              <details open={isOpen}>
                <summary
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCategory(category);
                  }}
                  className="font-semibold"
                >
                  <CategoryIcon className="w-4 h-4" />
                  {category}
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </summary>
                <ul>
                  {links.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`${isLinkActive(href) ? 'active' : ''} text-sm`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
