"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator, Users, Settings } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/pedidos', label: 'Pedidos Cliente', icon: Package }, // Este es el enlace correcto
  { href: '/proveedores', label: 'Pedidos Proveedor', icon: Truck },
  { href: '/almacen', label: 'Almacén', icon: Warehouse },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/tarifas', label: 'Tarifas', icon: DollarSign },
  { href: '/gestion/clientes', label: 'Gestión Clientes', icon: Users }, // Este es /gestion/clientes
  { href: '/gestion/productos', label: 'Gestión Productos', icon: Package },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    // Contenido del Drawer
    // --- MODIFICADO: Color de fondo más oscuro (bg-base-300) y altura h-full ---
    <div className="w-64 bg-base-300 p-4 flex flex-col h-full"> 
      <Link href="/" className="btn btn-ghost text-xl normal-case mb-4">
        CRM Taller
      </Link>
      <ul className="menu flex-grow">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            {/* --- MODIFICADO: Letras más grandes (text-base) --- */}
            <Link href={href} className={`${pathname === href ? 'active' : ''} text-base`}> 
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
