"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Warehouse, Package, FileText, Truck, Calculator, Users, Settings,
  Layers, Factory, ChevronDown, Menu, X, DollarSign,
  FilePlus, PackagePlus, Ship, TrendingDown, LogOut, Package2, Search
} from 'lucide-react';
import BarraBusqueda from '@/componentes/ui/BarraBusqueda';
import BusquedaGlobal from '@/componentes/ui/BusquedaGlobal';

// Secciones con grupos (dos bloques en el dropdown)
// Secciones con links planos (lista simple)
const NAV = [
  { label: 'Inicio', href: '/', single: true },

  {
    label: 'Ventas', hub: '/ventas',
    groups: [
      {
        titulo: 'Crear',
        links: [
          { href: '/presupuestos/nuevo', label: 'Nuevo presupuesto', icon: FilePlus },
          { href: '/pedidos/nuevo',      label: 'Nuevo pedido',      icon: PackagePlus },
        ]
      },
      {
        titulo: 'Ver',
        links: [
          { href: '/presupuestos', label: 'Presupuestos', icon: FileText },
          { href: '/pedidos',      label: 'Pedidos',      icon: Package },
        ]
      }
    ]
  },

  {
    label: 'Compras', hub: '/compras',
    groups: [
      {
        titulo: 'Crear',
        links: [
          { href: '/proveedores/nuevo-nacional',    label: 'Pedido nacional', icon: Truck },
          { href: '/proveedores/nuevo-importacion', label: 'Importación',     icon: Ship },
        ]
      },
      {
        titulo: 'Ver',
        links: [
          { href: '/proveedores',                        label: 'Pedidos proveedor', icon: Package },
          { href: '/gestion/catalogos/proveedores',      label: 'Proveedores',       icon: Factory },
        ]
      }
    ]
  },

  {
    label: 'Almacén', hub: '/almacen',
    links: [
      { href: '/gestion/catalogos/materiales', label: 'Materiales',  icon: Layers },
      { href: '/gestion/productos',            label: 'Productos',   icon: Package },
      { href: '/gestion/catalogos/fabricantes',label: 'Fabricantes', icon: Factory },
      { href: '/almacen/stock',                label: 'Stock',       icon: Warehouse },
    ]
  },

  {
    label: 'Gestión', hub: '/gestion',
    groups: [
      {
        titulo: 'Clientes',
        links: [
          { href: '/gestion/clientes', label: 'Ver clientes', icon: Users },
        ]
      },
      {
        titulo: 'Tarifas',
        links: [
          { href: '/tarifas', label: 'Tarifas de material', icon: DollarSign },
        ]
      }
    ]
  },

  {
    label: 'Herramientas', hub: '/herramientas',
    links: [
      { href: '/calculadora',                    label: 'Calculadora PVC',   icon: Calculator },
      { href: '/calculadora/logistica',          label: 'Calc. Envíos',      icon: Truck },
      { href: '/calculadora/inversa',            label: 'Calc. Inversa',     icon: TrendingDown },
      { href: '/herramientas/calculadora-contenedor', label: 'Contenedor',   icon: Package2 },
      { href: '/herramientas/carta-porte',       label: 'Carta de porte',    icon: FileText },
    ]
  },

  { label: 'Informes', href: '/informes', single: true },
];

const CONFIG_LINKS = [
  { href: '/configuracion/margenes',    label: 'Márgenes y Referencias' },
  { href: '/configuracion/logistica',   label: 'Logística' },
  { href: '/configuracion/tacos',       label: 'Tacos' },
  { href: '/configuracion/audit-log',   label: 'Audit Log' },
];

function isActive(href, pathname) {
  if (!href || href === '#') return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function sectionIsActive(item, pathname) {
  if (item.single) return isActive(item.href, pathname);
  if (isActive(item.hub, pathname)) return true;
  const allLinks = item.groups
    ? item.groups.flatMap(g => g.links)
    : (item.links || []);
  return allLinks.some(l => isActive(l.href, pathname));
}

// Fila de un link en el dropdown
function DropdownLink({ link, pathname, onClick }) {
  if (link.disabled) {
    return (
      <li>
        <span className="flex items-center gap-2 px-3 py-1.5 text-sm opacity-30 cursor-not-allowed select-none">
          {link.icon && <link.icon className="w-3.5 h-3.5 shrink-0" />}
          {link.label}
          <span className="ml-auto text-[10px] badge badge-ghost badge-xs">Próximo</span>
        </span>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={link.href}
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-base-200 transition-colors ${isActive(link.href, pathname) ? 'text-primary font-medium bg-primary/5' : ''}`}
      >
        {link.icon && <link.icon className="w-3.5 h-3.5 shrink-0 opacity-60" />}
        {link.label}
      </Link>
    </li>
  );
}

// Dropdown con grupos (dos columnas)
function GroupedDropdown({ item, pathname, onClose }) {
  return (
    <div className="flex gap-0">
      {item.groups.map((group, i) => (
        <div key={i} className="min-w-44">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-base-content/40">
            {group.titulo}
          </div>
          <ul className="pb-1">
            {group.links.map(link => (
              <DropdownLink key={link.label} link={link} pathname={pathname} onClick={onClose} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Dropdown con lista plana
function FlatDropdown({ item, pathname, onClose }) {
  return (
    <ul className="min-w-44 py-1">
      {item.links.map(link => (
        <DropdownLink key={link.label} link={link} pathname={pathname} onClick={onClose} />
      ))}
    </ul>
  );
}

// Wrapper: label como link al hub + toda el área activa como trigger del dropdown
function NavDropdown({ item, pathname, isOpen, onOpen, onToggle, onClose }) {
  const active = sectionIsActive(item, pathname);
  const hasGroups = Boolean(item.groups);

  return (
    <div className="relative" onMouseEnter={onOpen}>
      <div
        className={`flex items-center gap-0.5 h-9 px-2 rounded-btn select-none
          hover:bg-base-200 transition-colors text-sm font-medium
          ${active ? 'text-primary' : 'text-base-content'}`}
      >
        <Link href={item.hub} className="px-1 py-1 cursor-pointer" onClick={onClose}>
          {item.label}
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); onToggle(); }}
          className="p-0.5 rounded hover:bg-base-300 touch-manipulation"
          aria-label={`Menú ${item.label}`}
        >
          <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 bg-base-100 rounded-box z-50 shadow-xl border border-base-200 mt-0.5 overflow-hidden">
          {hasGroups
            ? <GroupedDropdown item={item} pathname={pathname} onClose={onClose} />
            : <FlatDropdown item={item} pathname={pathname} onClose={onClose} />
          }
        </div>
      )}
    </div>
  );
}

export default function Encabezado() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(null);
  const [busquedaOpen, setBusquedaOpen] = useState(false);
  const configActive = pathname.startsWith('/configuracion');
  const navRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveNav(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleCtrlK(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setBusquedaOpen(prev => !prev);
      }
    }
    document.addEventListener('keydown', handleCtrlK);
    return () => document.removeEventListener('keydown', handleCtrlK);
  }, []);

  const { data: authStatus } = useSWR('/api/auth/status');
  const authRequired = authStatus?.required ?? false;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-base-100 border-b border-base-200 shadow-sm">
      <div className="navbar px-4 min-h-14 h-14 max-w-screen-2xl mx-auto">

        {/* Brand */}
        <div className="flex-none mr-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-base hover:opacity-75 transition-opacity">
            <Warehouse className="w-5 h-5 text-primary" />
            <span className="hidden sm:block">CRM Taller</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav
          ref={navRef}
          className="flex-1 hidden lg:flex items-center gap-0"
          onMouseLeave={() => setActiveNav(null)}
        >
          {NAV.map(item =>
            item.single ? (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center h-9 px-3 rounded-btn text-sm font-medium hover:bg-base-200 transition-colors
                  ${isActive(item.href, pathname) ? 'text-primary' : 'text-base-content'}`}
              >
                {item.label}
              </Link>
            ) : (
              <NavDropdown
                key={item.label}
                item={item}
                pathname={pathname}
                isOpen={activeNav === item.label}
                onOpen={() => setActiveNav(item.label)}
                onToggle={() => setActiveNav(prev => prev === item.label ? null : item.label)}
                onClose={() => setActiveNav(null)}
              />
            )
          )}
        </nav>

        {/* Derecha: buscador + configuración + hamburguesa */}
        <div className="flex-none flex items-center gap-1.5 ml-auto">
          <button
            className="hidden lg:flex items-center gap-2 h-8 px-3 rounded-lg border border-base-300 bg-base-200/60 hover:bg-base-200 transition-colors text-sm text-base-content/40"
            onClick={() => setBusquedaOpen(true)}
            title="Búsqueda global (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden xl:block">Buscar...</span>
            <kbd className="kbd kbd-xs hidden xl:inline-flex">Ctrl+K</kbd>
          </button>

          {/* Configuración → hub */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={() => setActiveNav('__config')}
            onMouseLeave={() => setActiveNav(null)}
          >
            <Link
              href="/configuracion"
              className={`btn btn-ghost btn-sm btn-circle ${configActive ? 'text-primary' : ''}`}
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </Link>
            {activeNav === '__config' && (
              <ul className="absolute right-0 top-full menu bg-base-100 rounded-box z-50 w-56 p-2 shadow-xl border border-base-200 mt-0.5">
                {CONFIG_LINKS.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className={isActive(link.href, pathname) ? 'active' : ''}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {authRequired && (
                  <>
                    <li className="menu-title text-xs opacity-40 mt-1">Sesión</li>
                    <li>
                      <button onClick={handleLogout} className="flex items-center gap-2 text-error">
                        <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                      </button>
                    </li>
                  </>
                )}
              </ul>
            )}
          </div>

          {/* Hamburguesa móvil */}
          <button
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-base-200 bg-base-100 pb-3">
          <div className="px-4 py-3">
            <BarraBusqueda />
          </div>
          <ul className="menu menu-sm px-2">
            {NAV.map(item =>
              item.single ? (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setMobileOpen(false)}>{item.label}</Link>
                </li>
              ) : item.groups ? (
                <li key={item.label}>
                  <details>
                    <summary>
                      <Link href={item.hub} onClick={() => setMobileOpen(false)} className="font-medium">{item.label}</Link>
                    </summary>
                    <ul>
                      {item.groups.map(g => (
                        <li key={g.titulo}>
                          <span className="text-xs uppercase tracking-wider opacity-40 font-bold px-2 pt-2">{g.titulo}</span>
                          <ul>
                            {g.links.filter(l => !l.disabled).map(link => (
                              <li key={link.href}>
                                <Link href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ) : (
                <li key={item.label}>
                  <details>
                    <summary>
                      <Link href={item.hub} onClick={() => setMobileOpen(false)} className="font-medium">{item.label}</Link>
                    </summary>
                    <ul>
                      {item.links.map(link => (
                        <li key={link.href}>
                          <Link href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              )
            )}
            <li>
              <Link href="/configuracion" onClick={() => setMobileOpen(false)}>Configuración</Link>
            </li>
            {authRequired && (
              <li>
                <button onClick={handleLogout} className="flex items-center gap-2 text-error">
                  <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>

    <BusquedaGlobal open={busquedaOpen} onClose={() => setBusquedaOpen(false)} />
  );
}
