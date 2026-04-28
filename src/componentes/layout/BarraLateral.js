"use client";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator,
  Users, Settings, Layers, Factory, ChevronDown, BarChart2
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
      { href: '/pedidos', label: 'Pedidos Cliente', icon: Package }
    ]
  },
  {
    category: 'Compras',
    icon: Truck,
    links: [
      { href: '/proveedores', label: 'Pedidos Proveedor', icon: Truck },
      { href: '/gestion/catalogos/proveedores', label: 'Gestión Proveedores', icon: Factory }
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
      { href: '/calculadora', label: 'Calculadora', icon: Layers },
      { href: '/calculadora/logistica', label: 'Calculadora Envíos', icon: Truck },
      { href: '/calculadora/inversa', label: 'Calculadora Inversa', icon: DollarSign }
    ]
  },
  {
    category: 'Gestión',
    icon: Users,
    links: [
      { href: '/gestion/clientes', label: 'Clientes', icon: Users },
      { href: '/gestion/productos', label: 'Productos', icon: Package },
      { href: '/gestion/catalogos/materiales', label: 'Materiales', icon: Layers },
      { href: '/gestion/catalogos/fabricantes', label: 'Fabricantes', icon: Factory }
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
      { href: '/configuracion', label: 'Márgenes y Referencias', icon: Settings },
      { href: '/configuracion/logistica', label: 'Logística', icon: Truck },
      { href: '/configuracion/tacos', label: 'Tacos', icon: Layers },
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
