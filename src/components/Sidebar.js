"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator, 
    Users, Settings, Layers, Factory, Wrench 
} from 'lucide-react'; 

const links = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/pedidos', label: 'Pedidos Cliente', icon: Package }, 
  { href: '/proveedores', label: 'Pedidos Proveedor', icon: Truck },
  { href: '/almacen', label: 'Almacén', icon: Warehouse },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/tarifas', label: 'Tarifas', icon: DollarSign }, 
  
  // --- NUEVA SECCIÓN DE DOCUMENTACIÓN ---
/*   { href: '/maquinaria', label: 'Hub de Maquinaria', icon: Wrench }, 
 */  { href: '/gestion/documentos', label: 'Planos', icon: FileText }, 
  // -------------------------------------
  
  // Catálogos Maestros Aislados
  { href: '/gestion/clientes', label: 'Gestión Clientes', icon: Users }, 
  { href: '/gestion/productos', label: 'Gestión Productos', icon: Package },
  { href: '/gestion/catalogos/proveedores', label: 'Gestión Proveedores', icon: Truck },
  { href: '/gestion/catalogos/materiales', label: 'Gestión Materiales', icon: Layers },
  { href: '/gestion/catalogos/fabricantes', label: 'Gestión Fabricantes', icon: Factory },
  
  // Configuración Unificada
  { href: '/configuracion', label: 'Configuración Margenes, Referencias y Tarifa', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  
  // Función auxiliar para manejar el estado activo de los enlaces anidados
  const isLinkActive = (href) => {
    if (pathname === href) return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  }

  return (
    // Contenido del Drawer
    <div className="w-64 bg-base-300 p-4 flex flex-col h-full"> 
      <Link href="/" className="btn btn-ghost text-xl normal-case mb-4">
        CRM Taller
      </Link>
      <ul className="menu grow">
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
