"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator, Users, Settings, Layers, Factory } from 'lucide-react'; 

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/pedidos', label: 'Pedidos Cliente', icon: Package }, 
  { href: '/proveedores', label: 'Pedidos Proveedor', icon: Truck },
  { href: '/almacen', label: 'Almacén', icon: Warehouse },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/tarifas', label: 'Tarifas', icon: DollarSign },
  { href: '/gestion/clientes', label: 'Gestión Clientes', icon: Users }, 
  { href: '/gestion/productos', label: 'Gestión Productos', icon: Package },
  // NUEVOS ENLACES AISLADOS
  { href: '/gestion/catalogos/materiales', label: 'Gestión Materiales', icon: Layers },
  { href: '/gestion/catalogos/fabricantes', label: 'Gestión Fabricantes', icon: Factory },
  // ENLACE CONSOLIDADO DE CONFIGURACIÓN
  { href: '/configuracion', label: 'Configuración Reglas/Catálogos', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  // Función auxiliar para manejar el estado activo de los enlaces anidados
  const isLinkActive = (href) => {
    // Si la ruta es la raíz del enlace (ej: /gestion/catalogos), es activa.
    if (pathname === href) return true;
    // Si la ruta comienza con el enlace y no es el home (/)
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  }

  return (
    // Contenido del Drawer
    <div className="w-64 bg-base-300 p-4 flex flex-col h-full"> 
      <Link href="/" className="btn btn-ghost text-xl normal-case mb-4">
        CRM Taller
      </Link>
      <ul className="menu flex-grow">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={`${isLinkActive(href) ? 'active' : ''} text-base`}> 
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
