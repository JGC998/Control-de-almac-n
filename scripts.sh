#!/bin/zsh
echo "--- INICIANDO SCRIPT (Restaurar Estilo y Funcionalidad del Sidebar) ---"

# --- 1. Modificar layout.js para reimplementar el Drawer (menú deslizable) ---
echo "Modificando: src/app/layout.js"
cat <<'EOF_LAYOUT' > src/app/layout.js
"use client";
import { useState } from 'react'; // Importar useState
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

const geistSans = GeistSans;
const geistMono = GeistMono;

// (No se puede exportar metadata desde un Client Component)

export default function RootLayout({ children }) {
  // --- AÑADIDO: Estado para controlar el drawer ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);
  // --- FIN AÑADIDO ---

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {/* --- MODIFICADO: Estructura de Drawer de DaisyUI --- */}
        <div className="drawer lg:drawer-open">
          <input 
            id="my-drawer" 
            type="checkbox" 
            className="drawer-toggle" 
            checked={isDrawerOpen} 
            onChange={toggleDrawer} 
          />
          
          {/* Contenido (Header + Página) */}
          <div className="drawer-content flex flex-col h-screen">
            {/* El Header ahora recibe la función para el botón de hamburguesa */}
            <Header toggleDrawer={toggleDrawer} />
            <main className="flex-1 overflow-y-auto p-4 bg-base-100">
              {children}
            </main>
          </div>
          
          {/* Sidebar (Menú lateral) */}
          <div className="drawer-side z-50">
            <label htmlFor="my-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
            {/* El Sidebar ahora es el contenido del drawer */}
            <Sidebar />
          </div>
        </div>
        {/* --- FIN MODIFICACIÓN --- */}
      </body>
    </html>
  );
}
EOF_LAYOUT

# --- 2. Modificar Header.js para añadir el botón de hamburguesa ---
echo "Modificando: src/components/Header.js"
cat <<'EOF_HEADER' > src/components/Header.js
"use client";
import { Menu } from 'lucide-react';
import SearchBar from './SearchBar';
import Chatbot from './Chatbot';

// Acepta 'toggleDrawer' como prop
export default function Header({ toggleDrawer }) {
  return (
    <header className="sticky top-0 z-10 w-full bg-base-100 shadow-md">
      <div className="navbar px-4">
        {/* --- AÑADIDO: Botón de Hamburguesa (solo visible en móvil) --- */}
        <div className="flex-none lg:hidden">
          <button
            className="btn btn-square btn-ghost"
            onClick={toggleDrawer}
            aria-label="open sidebar"
          >
            <Menu />
          </button>
        </div>
        
        {/* Título (visible en móvil, oculto en desktop) */}
        <div className="flex-1 lg:hidden">
          <a className="btn btn-ghost text-xl normal-case">CRM Taller</a>
        </div>

        {/* SearchBar (visible en desktop, oculto en móvil) */}
        <div className="flex-1 hidden lg:flex">
          <SearchBar />
        </div>
        
        {/* Chatbot (siempre visible) */}
        <div className="flex-none">
          <Chatbot />
        </div>
      </div>
    </header>
  );
}
EOF_HEADER

# --- 3. Modificar Sidebar.js para cambiar estilos ---
echo "Modificando: src/components/Sidebar.js"
cat <<'EOF_SIDEBAR' > src/components/Sidebar.js
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, FileText, Truck, Warehouse, DollarSign, Calculator, Users, Settings } from 'lucide-react';

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
EOF_SIDEBAR

echo "--- ¡Estilo y funcionalidad del Sidebar restaurados! ---"
echo "El servidor de desarrollo debería recargarse automáticamente."
